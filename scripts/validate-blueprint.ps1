param(
  [Parameter(Mandatory = $true)]
  [string]$TargetPath,

  [switch]$Strict
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
$variables = Get-BlueprintVariables -Manifest $Context.Manifest -TargetRoot $TargetRoot -EnabledToolIds $Context.EnabledToolIds -AppliedVariables $appliedVariables -Overrides @{}
$folders = Get-BlueprintIncludedFolders -Context $Context
$files = Get-BlueprintIncludedFiles -Context $Context
$isBlueprintRoot = ((Get-BlueprintRoot).ToLowerInvariant() -eq $TargetRoot.ToLowerInvariant())

$missingFolders = @()
$missingFiles = @()
$unresolved = @()
$drift = @()
$sourceMissing = @()

foreach ($folder in $folders) {
  $targetFolder = Join-BlueprintPath -Root $TargetRoot -RelativePath $folder.path
  if (-not (Test-Path -LiteralPath $targetFolder -PathType Container)) {
    $missingFolders += $folder.path
  }
}

foreach ($file in $files) {
  $sourceFile = Join-BlueprintPath -Root $Context.TemplateRoot -RelativePath $file.source
  $targetFile = Join-BlueprintPath -Root $TargetRoot -RelativePath $file.target

  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    $sourceMissing += $file.source
  }

  if (-not (Test-Path -LiteralPath $targetFile -PathType Leaf)) {
    $missingFiles += $file.target
    continue
  }

  if ($file.render -eq $true) {
    $content = Get-Content -LiteralPath $targetFile -Raw
    $placeholders = Get-BlueprintUnresolvedPlaceholders -Content $content
    foreach ($placeholder in $placeholders) {
      $unresolved += "$($file.target): $placeholder"
    }
  }
}

if (-not $isBlueprintRoot) {
  foreach ($generatedFile in @($Context.Manifest.generatedFiles)) {
    $path = Join-BlueprintPath -Root $TargetRoot -RelativePath $generatedFile
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      $missingFiles += $generatedFile
    }
  }
}

if ($null -ne $existingApplied -and $null -ne $existingApplied.files) {
  foreach ($appliedFile in $existingApplied.files) {
    if ([string]::IsNullOrWhiteSpace($appliedFile.sha256)) {
      continue
    }

    $targetFile = Join-BlueprintPath -Root $TargetRoot -RelativePath $appliedFile.target
    if (-not (Test-Path -LiteralPath $targetFile -PathType Leaf)) {
      continue
    }

    $currentHash = Get-BlueprintFileSha256 -Path $targetFile
    if ($currentHash -ne $appliedFile.sha256) {
      $drift += $appliedFile.target
    }
  }
}

if ($isBlueprintRoot) {
  foreach ($blueprintFile in @($Context.Manifest.blueprintFiles)) {
    $path = Join-BlueprintPath -Root $TargetRoot -RelativePath $blueprintFile
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      $sourceMissing += $blueprintFile
    }
  }
}

if ($missingFolders.Count -eq 0 -and $missingFiles.Count -eq 0 -and $unresolved.Count -eq 0 -and $sourceMissing.Count -eq 0 -and (-not $Strict -or $drift.Count -eq 0)) {
  if ($drift.Count -gt 0) {
    Write-Host "Blueprint validation passed with drift warnings: $TargetRoot"
    Write-Host ""
    Write-Host "Drift detected in previously applied files:"
    $drift | ForEach-Object { Write-Host " - $_" }
  } else {
    Write-Host "Blueprint validation passed: $TargetRoot"
  }
  exit 0
}

Write-Host "Blueprint validation failed: $TargetRoot"

if ($sourceMissing.Count -gt 0) {
  Write-Host ""
  Write-Host "Missing blueprint source files:"
  $sourceMissing | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
}

if ($missingFolders.Count -gt 0) {
  Write-Host ""
  Write-Host "Missing folders:"
  $missingFolders | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
}

if ($missingFiles.Count -gt 0) {
  Write-Host ""
  Write-Host "Missing files:"
  $missingFiles | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
}

if ($unresolved.Count -gt 0) {
  Write-Host ""
  Write-Host "Unresolved template placeholders:"
  $unresolved | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
}

if ($drift.Count -gt 0) {
  Write-Host ""
  Write-Host "Drift detected in previously applied files:"
  $drift | Sort-Object -Unique | ForEach-Object { Write-Host " - $_" }
}

exit 1
