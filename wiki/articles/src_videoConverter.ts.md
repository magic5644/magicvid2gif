# videoConverter
> src/videoConverter.ts | Hub Score: 24/100

## Symbols
| Name | Type | Line |
|------|------|------|
| VideoConverter | class | 8 |
| constructor | method | 13 |
| initialize | method | 20 |
| checkFfmpeg | method | 29 |
| getVideoInfo | method | 39 |
| convert | method | 77 |
| getOptimizationFlags | method | 135 |
| buildFilterComplex | method | 142 |
| cancel | method | 161 |
| destroy | method | 167 |
| getFfmpegVersion | method | 171 |

## Called by
| Symbol | File | Line |
|--------|------|------|
| VideoConverter | [src/videoConverter.ts](src_videoConverter.ts.md) | 8 |
| getVideoInfo | [src/videoConverter.ts](src_videoConverter.ts.md) | 42 |
| activate | [src/extension.ts](src_extension.ts.md) | 46 |
| convert | [src/videoConverter.ts](src_videoConverter.ts.md) | 85 |
| convert | [src/videoConverter.ts](src_videoConverter.ts.md) | 94 |
| convert | [src/videoConverter.ts](src_videoConverter.ts.md) | 97 |
| destroy | [src/videoConverter.ts](src_videoConverter.ts.md) | 168 |

## External calls
| Symbol | File | Line |
|--------|------|------|
| VideoConverter | [src/videoConverter.ts](src_videoConverter.ts.md) | 8 |
| FfmpegManager | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 10 |
| FfmpegManager | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 13 |
| VideoMetadata | [src/types.ts](src_types.ts.md) | 39 |
| initialize | [src/videoConverter.ts](src_videoConverter.ts.md) | 42 |
| ConversionOptions | [src/types.ts](src_types.ts.md) | 80 |
| ProgressCallback | [src/types.ts](src_types.ts.md) | 81 |
| initialize | [src/videoConverter.ts](src_videoConverter.ts.md) | 85 |
| buildFilterComplex | [src/videoConverter.ts](src_videoConverter.ts.md) | 94 |
| getOptimizationFlags | [src/videoConverter.ts](src_videoConverter.ts.md) | 97 |
| FfmpegProgress | [src/types.ts](src_types.ts.md) | 113 |
| progressCallback | [src/extension.ts](src_extension.ts.md) | 117 |
| ConversionOptions | [src/types.ts](src_types.ts.md) | 142 |
| cancel | [src/videoConverter.ts](src_videoConverter.ts.md) | 168 |

## External calls
```mermaid
flowchart LR
  src_videoconverter_ts["src/videoConverter.ts"]
  src_ffmpegmanager_ts["src/ffmpegManager.ts"]
  src_videoconverter_ts --> src_ffmpegmanager_ts
  src_types_ts["src/types.ts"]
  src_videoconverter_ts --> src_types_ts
  src_extension_ts["src/extension.ts"]
  src_videoconverter_ts --> src_extension_ts
```

## Called by
```mermaid
flowchart LR
  src_videoconverter_ts["src/videoConverter.ts"]
  src_extension_ts["src/extension.ts"]
  src_extension_ts --> src_videoconverter_ts
```

## Control flow: `VideoConverter.convert()`
```mermaid
flowchart TD
  n0([VideoConverter.convert])
  n1{this.ffmpegPath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3{ready?}
  n2 --> n3
  n4[then]
  n3 -- yes --> n4
  n5[/throw/]
  n4 --> n5
  n6[ ]
  n5 --> n6
  n3 -- no --> n6
  n7[ ]
  n6 --> n7
  n1 -- no --> n7
  n8([return: new Promiseresolve, ])
  n7 --> n8
  n9([end])
  n8 --> n9
```

## Control flow: `VideoConverter.getVideoInfo()`
```mermaid
flowchart TD
  n0([VideoConverter.getVideoInfo])
  n1{this.ffmpegPath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3[await this.initialize]
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5([return: new Promiseresolve, ])
  n4 --> n5
  n6([end])
  n5 --> n6
```

## Control flow: `VideoConverter.buildFilterComplex()`
```mermaid
flowchart TD
  n0([VideoConverter.buildFilterComplex])
  n1{options.resolution and options.resolution original?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3[segments.pushscale$options.resolution:flagslanczos]
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{options.fps?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7[segments.pushfps$options.fps]
  n6 --> n7
  n8[ ]
  n7 --> n8
  n5 -- no --> n8
  n9[segments.push$paletteBasedither$dither]
  n8 --> n9
  n10([return: segments.join,])
  n9 --> n10
  n11([end])
  n10 --> n11
```
