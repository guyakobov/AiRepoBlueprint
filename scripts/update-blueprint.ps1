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
  [string]$ReviewPolicy,

  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$applyArgs = @{
  TargetPath = $TargetPath
}

foreach ($entry in @{
  ProjectName = $ProjectName
  ProjectType = $ProjectType
  PrimaryLanguage = $PrimaryLanguage
  Framework = $Framework
  PackageManager = $PackageManager
  InstallCommand = $InstallCommand
  TestCommand = $TestCommand
  LintCommand = $LintCommand
  BuildCommand = $BuildCommand
  RunCommand = $RunCommand
  DeploymentTarget = $DeploymentTarget
  ReviewPolicy = $ReviewPolicy
}.GetEnumerator()) {
  if (-not [string]::IsNullOrWhiteSpace($entry.Value)) {
    $applyArgs[$entry.Key] = $entry.Value
  }
}

if ($Force) {
  $applyArgs['Force'] = $true
}

& (Join-Path $PSScriptRoot 'apply-blueprint.ps1') @applyArgs
& (Join-Path $PSScriptRoot 'validate-blueprint.ps1') -TargetPath $TargetPath
