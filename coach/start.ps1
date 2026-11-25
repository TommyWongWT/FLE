$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'
$server = Join-Path $PSScriptRoot 'server.py'

& (Join-Path $PSScriptRoot 'setup.ps1')

function Set-LocalProviderKey($environmentName, $provider, $fileName) {
    if ([Environment]::GetEnvironmentVariable($environmentName, 'Process')) { return }
    $keyFile = Join-Path $env:LOCALAPPDATA "FLECoach\$fileName"
    if (Test-Path -LiteralPath $keyFile) {
        $secureKey = Get-Content -LiteralPath $keyFile -Raw | ConvertTo-SecureString
    } else {
        Write-Host "Enter your $provider API key. It will be encrypted for this Windows account and stored outside the repository."
        Write-Host "Press Enter to continue without $provider."
        $secureKey = Read-Host "$provider API key" -AsSecureString
    }

    if ($secureKey.Length -gt 0) {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
        try {
            [Environment]::SetEnvironmentVariable($environmentName, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer), 'Process')
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
        if (-not (Test-Path -LiteralPath $keyFile)) {
            $keyDirectory = Split-Path -Parent $keyFile
            if (-not (Test-Path -LiteralPath $keyDirectory)) {
                New-Item -ItemType Directory -Path $keyDirectory | Out-Null
            }
            $encryptedKey = ConvertFrom-SecureString -SecureString $secureKey
            New-Item -ItemType File -Path $keyFile -Value $encryptedKey | Out-Null
            Write-Host "$provider key saved locally."
        }
    } else {
        Write-Host "No $provider key entered; its AI features will be unavailable."
    }
}

$originalXaiKey = $env:XAI_API_KEY
$originalGeminiKey = $env:GEMINI_API_KEY
try {
    Set-LocalProviderKey 'XAI_API_KEY' 'xAI' 'xai-key.txt'
    Set-LocalProviderKey 'GEMINI_API_KEY' 'Gemini' 'gemini-key.txt'
    & $python $server --open
    if ($LASTEXITCODE -ne 0) {
        throw "The coach stopped with exit code $LASTEXITCODE."
    }
} finally {
    $env:XAI_API_KEY = $originalXaiKey
    $env:GEMINI_API_KEY = $originalGeminiKey
}
