$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $root '.venv'
$python = Join-Path $venv 'Scripts\python.exe'

function Test-Python($command, $prefix) {
    try {
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & $command @prefix -c 'import sys, venv; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

if (Test-Path -LiteralPath $venv) {
    if (-not (Test-Path -LiteralPath $python -PathType Leaf) -or -not (Test-Python $python @())) {
        throw 'The existing .venv is not a working Python 3.10+ environment. Check it or recreate it manually; setup will not overwrite it.'
    }
    Write-Host 'Using the existing local virtual environment.'
} else {
    Write-Host 'First-time setup: looking for Python 3.10 or newer...'
    $candidates = @()
    foreach ($name in @('py.exe', 'python.exe')) {
        $found = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue
        if ($found -and $found.Source -notlike '*\WindowsApps\*') {
            $prefix = @()
            if ($name -eq 'py.exe') { $prefix = @('-3') }
            $candidates += @{ Path = $found.Source; Prefix = $prefix }
        }
    }
    $selected = $null
    foreach ($candidate in $candidates) {
        if (Test-Python $candidate.Path $candidate.Prefix) { $selected = $candidate; break }
    }
    if (-not $selected) {
        throw 'Python 3.10+ with venv was not found. Install Python from https://www.python.org/downloads/windows/, reopen PowerShell, and run this launcher again.'
    }
    Write-Host 'Creating the local virtual environment. No packages need to be installed.'
    $prefix = $selected.Prefix
    & $selected.Path @prefix -m venv --without-pip $venv
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $python -PathType Leaf) -or -not (Test-Python $python @())) {
        throw 'Virtual environment creation failed. Check the Python installation and the .venv folder before retrying.'
    }
    Write-Host 'Local virtual environment ready.'
}
