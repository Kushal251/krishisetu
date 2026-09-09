$ErrorActionPreference = "Stop"
$serviceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $serviceRoot ".venv\Scripts\python.exe"
$python = if (Test-Path $venvPython) { $venvPython } else { "python" }

& $python (Join-Path $serviceRoot "auto_train.py") @args
exit $LASTEXITCODE
