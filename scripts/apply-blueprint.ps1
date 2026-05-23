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
. (Join-Path $PSScriptRoot 'Blueprint.Common.ps1')

if (-not (Test-Path -LiteralPath $TargetPath)) {
  New-Item -ItemType Directory -Path $TargetPath | Out-Null
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
$folders = Get-BlueprintIncludedFolders -Context $Context
$files = Get-BlueprintIncludedFiles -Context $Context

$createdFolders = 0
$createdFiles = 0
$overwrittenFiles = 0
$skippedFiles = 0
$appliedFiles = @()

foreach ($folder in $folders) {
  $targetFolder = Join-BlueprintPath -Root $TargetRoot -RelativePath $folder.path
  if (-not (Test-Path -LiteralPath $targetFolder -PathType Container)) {
    New-Item -ItemType Directory -Path $targetFolder | Out-Null
    $createdFolders += 1
    Write-Host "Created folder: $($folder.path)"
  }
}

foreach ($file in $files) {
  $sourceFile = Join-BlueprintPath -Root $Context.TemplateRoot -RelativePath $file.source
  $targetFile = Join-BlueprintPath -Root $TargetRoot -RelativePath $file.target
  $targetParent = Split-Path -Parent $targetFile

  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    throw "Template file listed in blueprint metadata is missing: $($file.source)"
  }

  if (-not (Test-Path -LiteralPath $targetParent -PathType Container)) {
    New-Item -ItemType Directory -Path $targetParent | Out-Null
  }

  $exists = Test-Path -LiteralPath $targetFile -PathType Leaf
  $status = 'created'

  if ($exists -and -not $Force) {
    $skippedFiles += 1
    $status = 'skipped_existing'
    Write-Host "Skipped existing file: $($file.target)"
  } else {
    if ($file.render -eq $true) {
      $content = Get-Content -LiteralPath $sourceFile -Raw
      $rendered = Render-BlueprintTemplate -Content $content -Variables $variables
      Set-Content -LiteralPath $targetFile -Value $rendered -Encoding UTF8 -NoNewline
    } else {
      Copy-Item -LiteralPath $sourceFile -Destination $targetFile -Force
    }

    if ($exists) {
      $overwrittenFiles += 1
      $status = 'overwritten'
      Write-Host "Overwrote file: $($file.target)"
    } else {
      $createdFiles += 1
      Write-Host "Created file: $($file.target)"
    }
  }

  $appliedFiles += [ordered]@{
    target = $file.target
    source = $file.source
    sourceType = $file.sourceType
    tool = $file.tool
    ownership = $file.ownership
    status = $status
    sha256 = Get-BlueprintFileSha256 -Path $targetFile
  }
}

$blueprintFolder = Join-BlueprintPath -Root $TargetRoot -RelativePath '.blueprint'
if (-not (Test-Path -LiteralPath $blueprintFolder -PathType Container)) {
  New-Item -ItemType Directory -Path $blueprintFolder | Out-Null
}

$appliedPath = Join-BlueprintPath -Root $TargetRoot -RelativePath '.blueprint/applied.json'
$appliedRecord = [ordered]@{
  blueprint = $Context.Manifest.name
  blueprintVersion = $Context.Manifest.version
  appliedAt = (Get-Date).ToUniversalTime().ToString('o')
  enabledTools = @($Context.EnabledToolIds)
  variables = $variables
  files = $appliedFiles
}

$appliedRecord | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $appliedPath -Encoding UTF8

Write-Host ""
Write-Host "Blueprint applied to: $TargetRoot"
Write-Host "Enabled tools: $($Context.EnabledToolIds -join ', ')"
Write-Host "Folders created: $createdFolders"
Write-Host "Files created: $createdFiles"
Write-Host "Files overwritten: $overwrittenFiles"
Write-Host "Files skipped: $skippedFiles"
Write-Host "Metadata written: .blueprint/applied.json"
