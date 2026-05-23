param(
  [Parameter(Mandatory = $true)]
  [string]$TargetPath,

  [string]$ProjectName,
  [string]$ProjectType,
  [string]$PrimaryLanguage,
  [string]$Framework,
  [string]$PackageManager,
  [string]$InstallCommand,
  [string]$TestCommand,
  [string]$LintCommand,
  [string]$BuildCommand,
  [string]$RunCommand,
  [string]$DeploymentTarget,
  [string]$ReviewPolicy
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Blueprint.Common.ps1')

if (-not (Test-Path -LiteralPath $TargetPath -PathType Container)) {
  Write-Error "Target path does not exist: $TargetPath"
  exit 1
}

$TargetRoot = (Resolve-Path -LiteralPath $TargetPath).Path
$Context = Get-BlueprintContext
$existingApplied = Get-BlueprintAppliedMetadata -TargetRoot $TargetRoot
$appliedVariables = ConvertTo-BlueprintHashtable -Object $existingApplied.variables
$overrides = New-BlueprintOverrideMap `
  -ProjectName $ProjectName `
  -ProjectType $ProjectType `
  -PrimaryLanguage $PrimaryLanguage `
  -Framework $Framework `
  -PackageManager $PackageManager `
  -InstallCommand $InstallCommand `
  -TestCommand $TestCommand `
  -LintCommand $LintCommand `
  -BuildCommand $BuildCommand `
  -RunCommand $RunCommand `
  -DeploymentTarget $DeploymentTarget `
  -ReviewPolicy $ReviewPolicy

$variables = Get-BlueprintVariables -Manifest $Context.Manifest -TargetRoot $TargetRoot -EnabledToolIds $Context.EnabledToolIds -AppliedVariables $appliedVariables -Overrides $overrides
$files = Get-BlueprintIncludedFiles -Context $Context
$differences = 0

foreach ($file in $files) {
  $sourceFile = Join-BlueprintPath -Root $Context.TemplateRoot -RelativePath $file.source
  $targetFile = Join-BlueprintPath -Root $TargetRoot -RelativePath $file.target

  if (-not (Test-Path -LiteralPath $targetFile -PathType Leaf)) {
    Write-Host "Missing: $($file.target)"
    $differences += 1
    continue
  }

  $expected = Get-Content -LiteralPath $sourceFile -Raw
  if ($file.render -eq $true) {
    $expected = Render-BlueprintTemplate -Content $expected -Variables $variables
  }

  $actual = Get-Content -LiteralPath $targetFile -Raw
  if ($actual -eq $expected) {
    Write-Host "Match: $($file.target)"
  } else {
    Write-Host "Different: $($file.target)"
    $differences += 1
  }
}

if ($differences -gt 0) {
  Write-Host ""
  Write-Host "Blueprint diff found $differences difference(s)."
  exit 1
}

Write-Host ""
Write-Host "Blueprint diff found no differences."
exit 0
