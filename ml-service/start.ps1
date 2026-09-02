$ErrorActionPreference = "Stop"
$serviceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $serviceRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $venvPython)) {
  throw "ML virtual environment is missing. Create ml-service/.venv and install requirements.txt first."
}

Push-Location $serviceRoot
try {
  & $venvPython -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
} finally {
  Pop-Location
}
