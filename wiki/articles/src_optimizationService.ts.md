# optimizationService
> src/optimizationService.ts | Hub Score: 19/100

## Symbols
| Name | Type | Line |
|------|------|------|
| OptimizationService | class | 10 |
| constructor | method | 14 |
| checkGifsicle | method | 18 |
| optimize | method | 36 |
| getGifInfo | method | 71 |

## Called by
| Symbol | File | Line |
|--------|------|------|
| OptimizationService | [src/optimizationService.ts](src_optimizationService.ts.md) | 10 |
| optimize | [src/optimizationService.ts](src_optimizationService.ts.md) | 38 |
| activate | [src/extension.ts](src_extension.ts.md) | 47 |
| getGifInfo | [src/optimizationService.ts](src_optimizationService.ts.md) | 73 |

## External calls
| Symbol | File | Line |
|--------|------|------|
| OptimizationService | [src/optimizationService.ts](src_optimizationService.ts.md) | 10 |
| SettingsPort | [src/types/ports.ts](src_types_ports.ts.md) | 11 |
| SettingsPort | [src/types/ports.ts](src_types_ports.ts.md) | 14 |
| ConversionOptions | [src/types.ts](src_types.ts.md) | 36 |
| checkGifsicle | [src/optimizationService.ts](src_optimizationService.ts.md) | 38 |
| checkGifsicle | [src/optimizationService.ts](src_optimizationService.ts.md) | 73 |

## External calls
```mermaid
flowchart LR
  src_optimizationservice_ts["src/optimizationService.ts"]
  types_ports_ts["src/types/ports.ts"]
  src_optimizationservice_ts --> types_ports_ts
  src_types_ts["src/types.ts"]
  src_optimizationservice_ts --> src_types_ts
```

## Called by
```mermaid
flowchart LR
  src_optimizationservice_ts["src/optimizationService.ts"]
  src_extension_ts["src/extension.ts"]
  src_extension_ts --> src_optimizationservice_ts
```

## Control flow: `OptimizationService.optimize()`
```mermaid
flowchart TD
  n0([OptimizationService.optimize])
  n1{this.gifsiclePath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3[await this.checkGifsicle]
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{this.gifsiclePath?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7[/throw/]
  n6 --> n7
  n8[ ]
  n7 --> n8
  n5 -- no --> n8
  n9[try block]
  n8 --> n9
  n10[catch error]
  n9 -- error --> n10
  n11([end])
  n9 --> n11
```

## Control flow: `OptimizationService.getGifInfo()`
```mermaid
flowchart TD
  n0([OptimizationService.getGifInfo])
  n1{this.gifsiclePath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3[await this.checkGifsicle]
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{this.gifsiclePath?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7[/throw/]
  n6 --> n7
  n8[ ]
  n7 --> n8
  n5 -- no --> n8
  n9[try block]
  n8 --> n9
  n10[catch error]
  n9 -- error --> n10
  n11([end])
  n9 --> n11
```

## Control flow: `OptimizationService.checkGifsicle()`
```mermaid
flowchart TD
  n0([OptimizationService.checkGifsicle])
  n1{customPath and fs.existsSynccustomPath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3([return: true])
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5[try block]
  n4 --> n5
  n6[catch error]
  n5 -- error --> n6
  n7([end])
  n5 --> n7
```
