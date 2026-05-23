$script:BlueprintRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

function Get-BlueprintRoot {
  return $script:BlueprintRoot
}

function Join-BlueprintPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root,

    [Parameter(Mandatory = $true)]
    [string]$RelativePath
  )

  return Join-Path $Root ($RelativePath -replace '/', '\')
}

function Read-BlueprintJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Required JSON file not found: $Path"
  }

  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function ConvertTo-BlueprintHashtable {
  param($Object)

  $table = @{}
  if ($null -eq $Object) {
    return $table
  }

  foreach ($property in $Object.PSObject.Properties) {
    $table[$property.Name] = [string]$property.Value
  }

  return $table
}

function Get-BlueprintContext {
  $root = Get-BlueprintRoot
  $manifest = Read-BlueprintJson -Path (Join-BlueprintPath -Root $root -RelativePath '.blueprint/manifest.json')
  $toolRegistry = Read-BlueprintJson -Path (Join-BlueprintPath -Root $root -RelativePath $manifest.toolsPath)
  $enabledTools = @()

  foreach ($tool in @($toolRegistry.tools)) {
    if ($tool.enabled -eq $true) {
      $enabledTools += $tool
    }
  }

  return [PSCustomObject]@{
    Root = $root
    Manifest = $manifest
    ToolRegistry = $toolRegistry
    EnabledTools = $enabledTools
    EnabledToolIds = @($enabledTools | ForEach-Object { $_.id })
    TemplateRoot = Join-BlueprintPath -Root $root -RelativePath $manifest.templateRoot
  }
}

function New-BlueprintFolderItem {
  param(
    $Folder,
    [string]$Source
  )

  return [PSCustomObject]@{
    path = [string]$Folder.path
    ownership = [string]$Folder.ownership
    source = $Source
  }
}

function New-BlueprintFileItem {
  param(
    $File,
    [string]$Source,
    [string]$ToolId
  )

  return [PSCustomObject]@{
    source = [string]$File.source
    target = [string]$File.target
    render = ($File.render -eq $true)
    ownership = [string]$File.ownership
    sourceType = $Source
    tool = $ToolId
  }
}

function Get-BlueprintIncludedFolders {
  param($Context)

  $items = @()
  foreach ($folder in @($Context.Manifest.sharedFolders)) {
    $items += New-BlueprintFolderItem -Folder $folder -Source 'shared'
  }

  foreach ($tool in @($Context.EnabledTools)) {
    foreach ($folder in @($tool.folders)) {
      $items += New-BlueprintFolderItem -Folder $folder -Source $tool.id
    }
  }

  return $items
}

function Get-BlueprintIncludedFiles {
  param($Context)

  $items = @()
  foreach ($file in @($Context.Manifest.sharedFiles)) {
    $items += New-BlueprintFileItem -File $file -Source 'shared' -ToolId ''
  }

  foreach ($tool in @($Context.EnabledTools)) {
    foreach ($file in @($tool.files)) {
      $items += New-BlueprintFileItem -File $file -Source 'tool' -ToolId $tool.id
    }
  }

  return $items
}

function Get-BlueprintAppliedMetadata {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TargetRoot
  )

  $path = Join-BlueprintPath -Root $TargetRoot -RelativePath '.blueprint/applied.json'
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    return $null
  }

  return Read-BlueprintJson -Path $path
}

function Get-BlueprintVariables {
  param(
    [Parameter(Mandatory = $true)]
    $Manifest,

    [Parameter(Mandatory = $true)]
    [string]$TargetRoot,

    [string[]]$EnabledToolIds,

    [hashtable]$AppliedVariables,

    [hashtable]$Overrides
  )

  $variables = ConvertTo-BlueprintHashtable -Object $Manifest.defaults

  if ($null -ne $AppliedVariables) {
    foreach ($key in $AppliedVariables.Keys) {
      if (-not [string]::IsNullOrWhiteSpace([string]$AppliedVariables[$key])) {
        $variables[$key] = [string]$AppliedVariables[$key]
      }
    }
  }

  if ($null -ne $Overrides) {
    foreach ($key in $Overrides.Keys) {
      if (-not [string]::IsNullOrWhiteSpace([string]$Overrides[$key])) {
        $variables[$key] = [string]$Overrides[$key]
      }
    }
  }

  if (($null -eq $Overrides -or -not $Overrides.ContainsKey('ProjectName')) -and
      ($null -eq $AppliedVariables -or -not $AppliedVariables.ContainsKey('ProjectName'))) {
    $leaf = Split-Path -Leaf $TargetRoot
    if (-not [string]::IsNullOrWhiteSpace($leaf)) {
      $variables['ProjectName'] = $leaf
    }
  }

  $variables['BlueprintVersion'] = [string]$Manifest.version
  $variables['EnabledTools'] = ($EnabledToolIds -join ', ')
  $variables['AppliedDate'] = Get-Date -Format 'yyyy-MM-dd'

  return $variables
}

function Render-BlueprintTemplate {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Content,

    [Parameter(Mandatory = $true)]
    [hashtable]$Variables
  )

  $rendered = $Content
  foreach ($key in $Variables.Keys) {
    $rendered = $rendered.Replace('{{' + $key + '}}', [string]$Variables[$key])
  }

  return $rendered
}

function Get-BlueprintFileSha256 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-BlueprintUnresolvedPlaceholders {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $matches = [regex]::Matches($Content, '\{\{[A-Za-z0-9_]+\}\}')
  $placeholders = @()
  foreach ($match in $matches) {
    if ($placeholders -notcontains $match.Value) {
      $placeholders += $match.Value
    }
  }

  return $placeholders
}

function New-BlueprintOverrideMap {
  param(
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

  $overrides = @{}
  $candidates = @{
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
  }

  foreach ($key in $candidates.Keys) {
    if (-not [string]::IsNullOrWhiteSpace($candidates[$key])) {
      $overrides[$key] = $candidates[$key]
    }
  }

  return $overrides
}
