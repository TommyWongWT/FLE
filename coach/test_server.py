import io
import json
import os
import threading
import unittest
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import Request

from server import Handler, ThreadingHTTPServer, open_provider


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def post(self, payload, origin=None, path="/api/feedback"):
        host = f"127.0.0.1:{self.server.server_port}"
        connection = HTTPConnection("127.0.0.1", self.server.server_port)
        connection.request("POST", path, json.dumps(payload), {
            "Content-Type": "application/json",
            "Origin": origin or f"http://{host}",
        })
        response = connection.getresponse()
        result = json.loads(response.read())
        connection.close()
        return response.status, result

    def test_requires_same_origin_and_valid_payload(self):
        self.assertEqual(self.post({"mode": "review", "text": "answer"}, "https://example.com")[0], 403)
        self.assertEqual(self.post({"mode": "invalid", "text": "answer"})[0], 400)
        self.assertEqual(self.post({"mode": "review", "text": " "})[0], 400)

    def test_missing_key_is_explicit(self):
        with patch.dict(os.environ, {}, clear=True):
            status, result = self.post({"mode": "review", "text": "answer"})
        self.assertEqual(status, 503)
        self.assertIn("XAI_API_KEY", result["error"])

    def test_feedback_uses_xai_and_handles_truncation(self):
        result = {"choices": [{"message": {"content": "Specific feedback"}, "finish_reason": "stop"}]}
        with patch.dict(os.environ, {"XAI_API_KEY": "test-key", "XAI_MODEL": "test-model"}):
            with patch("server.open_provider", return_value=io.BytesIO(json.dumps(result).encode())) as send:
                status, response = self.post({"mode": "challenge", "text": "test answer"})
                request = send.call_args.args[0]
                payload = json.loads(request.data)
                self.assertEqual(request.full_url, "https://api.x.ai/v1/chat/completions")
                self.assertEqual(payload["model"], "test-model")
                self.assertIn("Mode: challenge", payload["messages"][1]["content"])
                self.assertEqual((status, response["feedback"]), (200, "Specific feedback"))
            result["choices"][0]["finish_reason"] = "length"
            with patch("server.open_provider", return_value=io.BytesIO(json.dumps(result).encode())):
                status, response = self.post({"mode": "review", "text": "test answer"})
                self.assertEqual(status, 502)
                self.assertIn("truncated", response["error"])

    def test_learning_mode_requests_original_lesson(self):
        response = {"choices": [{"message": {"content": "Lesson"}, "finish_reason": "stop"}]}
        with patch.dict(os.environ, {"XAI_API_KEY": "test-key"}):
            with patch("server.open_provider", return_value=io.BytesIO(json.dumps(response).encode())) as send:
                status, result = self.post({"mode": "learn", "text": "Selected learning fields: finance, risk"})
                payload = json.loads(send.call_args.args[0].data)
                self.assertEqual((status, result["feedback"]), (200, "Lesson"))
                self.assertIn("original self-check questions", payload["messages"][0]["content"])
                self.assertIn("Do not reproduce", payload["messages"][0]["content"])
                self.assertIn("Mode: learn", payload["messages"][1]["content"])
                self.assertIn("finance, risk", payload["messages"][1]["content"])

    def test_status_checks_only_model_metadata(self):
        with patch.dict(os.environ, {"XAI_API_KEY": "test-key", "XAI_MODEL": "test-model"}):
            with patch("server.open_provider", return_value=io.BytesIO(b'{"id":"test-model"}')) as send:
                status, result = self.post({}, path="/api/status")
                request = send.call_args.args[0]
                self.assertEqual((status, result["model"]), (200, "test-model"))
                self.assertEqual(request.full_url, "https://api.x.ai/v1/models/test-model")
                self.assertEqual(request.get_method(), "GET")
                self.assertIsNone(request.data)
            self.assertEqual(self.post({"answer": "not sent"}, path="/api/status")[0], 400)
            self.assertEqual(self.post({}, "https://example.com", "/api/status")[0], 403)

    def test_status_reports_missing_key_and_provider_errors(self):
        with patch.dict(os.environ, {}, clear=True):
            status, result = self.post({}, path="/api/status")
            self.assertEqual(status, 503)
            self.assertIn("No API key", result["error"])
        with patch.dict(os.environ, {"XAI_API_KEY": "test-key"}):
            for code, expected in [(401, "rejected"), (403, "permissions"), (404, "model"), (429, "rate-limiting")]:
                error = HTTPError("https://api.x.ai/", code, "error", {}, None)
                with self.subTest(code=code), patch("server.open_provider", side_effect=error):
                    status, result = self.post({}, path="/api/status")
                    self.assertEqual(status, 502)
                    self.assertIn(expected, result["error"])
            with patch("server.open_provider", side_effect=URLError("offline")):
                status, result = self.post({}, path="/api/status")
                self.assertEqual(status, 502)
                self.assertIn("offline", result["error"])
            with patch("server.open_provider", return_value=io.BytesIO(b'{}')):
                status, result = self.post({}, path="/api/status")
                self.assertEqual(status, 502)
                self.assertIn("Invalid model information", result["error"])

    def test_gemini_crosscheck_sends_grok_material_and_returns_separate_text(self):
        response = {"candidates": [{"finishReason": "STOP", "content": {"parts": [
            {"text": "private reasoning", "thought": True}, {"text": "Cross-check result"}
        ]}}]}
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"}):
            with patch("server.open_provider", return_value=io.BytesIO(json.dumps(response).encode())) as send:
                status, result = self.post({"text": "Answer and Grok feedback"}, path="/api/crosscheck")
                request = send.call_args.args[0]
                payload = json.loads(request.data)
                self.assertEqual(status, 200)
                self.assertEqual(result["feedback"], "Cross-check result")
                self.assertEqual(request.full_url, "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent")
                self.assertEqual(request.get_header("X-goog-api-key"), "test-key")
                self.assertEqual(payload["contents"][0]["parts"][0]["text"], "Answer and Grok feedback")
                self.assertIn("cross-check", payload["systemInstruction"]["parts"][0]["text"])
            self.assertEqual(self.post({"text": " "}, path="/api/crosscheck")[0], 400)
            self.assertEqual(self.post({"text": "test"}, "https://example.com", "/api/crosscheck")[0], 403)

    def test_gemini_crosscheck_reports_missing_key_and_incomplete_response(self):
        with patch.dict(os.environ, {}, clear=True):
            status, result = self.post({"text": "test"}, path="/api/crosscheck")
            self.assertEqual(status, 503)
            self.assertIn("Gemini API key", result["error"])
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
            for response in [
                {"promptFeedback": {"blockReason": "SAFETY"}},
                {"candidates": [{"finishReason": "MAX_TOKENS"}]},
                {"candidates": [{"finishReason": "STOP", "content": {"parts": []}}]},
            ]:
                with self.subTest(response=response), patch("server.open_provider", return_value=io.BytesIO(json.dumps(response).encode())):
                    self.assertEqual(self.post({"text": "test"}, path="/api/crosscheck")[0], 502)

    def test_gemini_status_uses_metadata_only(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"}):
            with patch("server.open_provider", return_value=io.BytesIO(b'{"name":"models/test-model"}')) as send:
                status, result = self.post({}, path="/api/gemini-status")
                request = send.call_args.args[0]
                self.assertEqual((status, result["model"]), (200, "test-model"))
                self.assertEqual(request.full_url, "https://generativelanguage.googleapis.com/v1beta/models/test-model")
                self.assertEqual(request.get_method(), "GET")
                self.assertIsNone(request.data)
            self.assertEqual(self.post({"answer": "not sent"}, path="/api/gemini-status")[0], 400)

    def test_provider_requests_do_not_follow_redirects(self):
        class RedirectHandler(BaseHTTPRequestHandler):
            reached_destination = False

            def do_GET(self):
                if self.path == "/redirect":
                    self.send_response(302)
                    self.send_header("Location", f"http://127.0.0.1:{self.server.server_port}/destination")
                    self.end_headers()
                else:
                    RedirectHandler.reached_destination = True
                    self.send_response(200)
                    self.end_headers()

            def log_message(self, format, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), RedirectHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for header in ("Authorization", "x-goog-api-key"):
                request = Request(f"http://127.0.0.1:{server.server_port}/redirect", headers={header: "fake-key"})
                with self.subTest(header=header), self.assertRaises(HTTPError) as error:
                    open_provider(request, timeout=5)
                self.assertEqual(error.exception.code, 302)
                self.assertFalse(RedirectHandler.reached_destination)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
