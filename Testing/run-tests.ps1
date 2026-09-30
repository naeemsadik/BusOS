[CmdletBinding()]
param(
    [ValidateSet("chrome", "firefox", "edge")]
    [string]$Browser = "chrome",
    [string]$Marker = "",
    [switch]$Headed,
    [switch]$Install
)

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {
    if ($Install) {
        python -m pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    $pytestArgs = @("-m", "pytest", "--busos-browser", $Browser)
    if ($Headed) { $pytestArgs += "--busos-headed" }
    if ($Marker) { $pytestArgs += @("-m", $Marker) }
    python @pytestArgs
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}

