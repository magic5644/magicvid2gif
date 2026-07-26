# workspacePort
> src/platform/vscode/workspacePort.ts | Hub Score: 14/100

## Symbols
| Name | Type | Line |
|------|------|------|
| VsCodeWorkspacePort | class | 4 |
| constructor | method | 7 |
| toFsPath | method | 11 |
| storagePath | method | 15 |
| tmpPath | method | 19 |
| createWorkspacePort | function | 24 |

## Called by
| Symbol | File | Line |
|--------|------|------|
| VsCodeWorkspacePort | [src/platform/vscode/workspacePort.ts](src_platform_vscode_workspacePort.ts.md) | 4 |
| activate | [src/extension.ts](src_extension.ts.md) | 19 |
| createWorkspacePort | [src/platform/vscode/workspacePort.ts](src_platform_vscode_workspacePort.ts.md) | 25 |

## External calls
| Symbol | File | Line |
|--------|------|------|
| VsCodeWorkspacePort | [src/platform/vscode/workspacePort.ts](src_platform_vscode_workspacePort.ts.md) | 4 |
| WorkspacePort | [src/types/ports.ts](src_types_ports.ts.md) | 4 |
| WorkspacePort | [src/types/ports.ts](src_types_ports.ts.md) | 24 |
| VsCodeWorkspacePort | [src/platform/vscode/workspacePort.ts](src_platform_vscode_workspacePort.ts.md) | 25 |

## External calls
```mermaid
flowchart LR
  vscode_workspaceport_ts["src/platform/vscode/workspacePort.ts"]
  types_ports_ts["src/types/ports.ts"]
  vscode_workspaceport_ts --> types_ports_ts
```

## Called by
```mermaid
flowchart LR
  vscode_workspaceport_ts["src/platform/vscode/workspacePort.ts"]
  src_extension_ts["src/extension.ts"]
  src_extension_ts --> vscode_workspaceport_ts
```
