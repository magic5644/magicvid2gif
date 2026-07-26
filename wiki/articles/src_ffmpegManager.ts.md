# ffmpegManager
> src/ffmpegManager.ts | Hub Score: 100/100

## Symbols
| Name | Type | Line |
|------|------|------|
| FfmpegBinary | interface | 12 |
| FfmpegManager | class | 19 |
| constructor | method | 73 |
| getInstance | method | 79 |
| getFfmpegPath | method | 89 |
| installFfmpeg | method | 136 |
| resolveBinary | method | 173 |
| computePaths | method | 189 |
| existingBinaryExists | method | 200 |
| ensureDirectories | method | 204 |
| ensureFfmpeg | method | 216 |
| downloadWithProgress | method | 244 |
| downloadArchive | method | 296 |
| extractAndCleanup | method | 300 |
| makeExecutableAndVerify | method | 310 |
| installFfmpegDarwinArm | method | 325 |
| isCommandAvailable | method | 344 |
| resolveSystemFfmpeg | method | 353 |
| tryUseOrInstallBrew | method | 393 |
| promptInstallBrewOrFallback | method | 416 |
| installBrewAndFfmpeg | method | 426 |
| downloadOsxExpertsFallback | method | 446 |
| verifyOsxArchive | method | 466 |
| installOsxArchive | method | 484 |
| safeFetchOsxChecksum | method | 497 |
| fetchOsxExpertsChecksum | method | 505 |
| computeFileSha256 | method | 519 |
| extractArchive | method | 528 |
| getExecutableName | method | 560 |
| performInstallSteps | method | 564 |
| getVersion | method | 593 |

## Called by
| Symbol | File | Line |
|--------|------|------|
| VideoConverter | [src/videoConverter.ts](src_videoConverter.ts.md) | 10 |
| FfmpegBinary | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 12 |
| constructor | [src/videoConverter.ts](src_videoConverter.ts.md) | 13 |
| FfmpegManager | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 19 |
| FfmpegManager | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 28 |
| getInstance | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 79 |
| getInstance | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 81 |
| getFfmpegPath | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 98 |
| getFfmpegPath | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 114 |
| installFfmpeg | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 144 |
| installFfmpeg | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 147 |
| installFfmpeg | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 149 |
| installFfmpeg | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 158 |
| resolveBinary | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 173 |
| computePaths | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 189 |
| ensureFfmpeg | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 217 |
| ensureFfmpeg | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 231 |
| downloadWithProgress | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 259 |
| downloadArchive | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 297 |
| extractAndCleanup | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 302 |

## External calls
| Symbol | File | Line |
|--------|------|------|
| FfmpegBinary | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 12 |
| FfmpegManager | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 19 |
| UiPort | [src/types/ports.ts](src_types_ports.ts.md) | 21 |
| SettingsPort | [src/types/ports.ts](src_types_ports.ts.md) | 22 |
| WorkspacePort | [src/types/ports.ts](src_types_ports.ts.md) | 23 |
| FfmpegBinary | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 28 |
| UiPort | [src/types/ports.ts](src_types_ports.ts.md) | 73 |
| SettingsPort | [src/types/ports.ts](src_types_ports.ts.md) | 73 |
| WorkspacePort | [src/types/ports.ts](src_types_ports.ts.md) | 73 |
| UiPort | [src/types/ports.ts](src_types_ports.ts.md) | 79 |
| SettingsPort | [src/types/ports.ts](src_types_ports.ts.md) | 79 |
| WorkspacePort | [src/types/ports.ts](src_types_ports.ts.md) | 79 |
| FfmpegManager | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 79 |
| FfmpegManager | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 81 |
| getExecutableName | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 98 |
| resolveSystemFfmpeg | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 114 |
| resolveBinary | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 144 |
| computePaths | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 147 |
| existingBinaryExists | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 149 |
| performInstallSteps | [src/ffmpegManager.ts](src_ffmpegManager.ts.md) | 158 |

## External calls
```mermaid
flowchart LR
  src_ffmpegmanager_ts["src/ffmpegManager.ts"]
  types_ports_ts["src/types/ports.ts"]
  src_ffmpegmanager_ts --> types_ports_ts
```

## Called by
```mermaid
flowchart LR
  src_ffmpegmanager_ts["src/ffmpegManager.ts"]
  src_videoconverter_ts["src/videoConverter.ts"]
  src_videoconverter_ts --> src_ffmpegmanager_ts
```

## Control flow: `FfmpegManager.extractArchive()`
```mermaid
flowchart TD
  n0([FfmpegManager.extractArchive])
  n1{archive.endsWith.zip?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3[try block]
  n2 --> n3
  n4[catch err]
  n3 -- error --> n4
  n5[else]
  n1 -- no --> n5
  n6[ ]
  n3 --> n6
  n5 --> n6
  n7{extractSubPath?}
  n6 --> n7
  n8[then]
  n7 -- yes --> n8
  n9{fs.existsSyncextractedBin?}
  n8 --> n9
  n10[then]
  n9 -- yes --> n10
  n11[fs.copyFileSyncextractedBin, finalBin]
  n10 --> n11
  n12[else]
  n9 -- no --> n12
  n13[/throw/]
  n12 --> n13
  n14[ ]
  n11 --> n14
  n13 --> n14
  n15[ ]
  n14 --> n15
  n7 -- no --> n15
  n16([end])
  n15 --> n16
```

## Control flow: `FfmpegManager.resolveSystemFfmpeg()`
```mermaid
flowchart TD
  n0([FfmpegManager.resolveSystemFfmpeg])
  n1[try block]
  n0 --> n1
  n2[catch]
  n1 -- error --> n2
  n3([return: null])
  n1 --> n3
  n4([end])
  n3 --> n4
```

## Control flow: `FfmpegManager.getFfmpegPath()`
```mermaid
flowchart TD
  n0([FfmpegManager.getFfmpegPath])
  n1{this.ffmpegPath and fs.existsSyncthis.ffmpegPath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3([return: this.ffmpegPath])
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{globalStorage?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7{fs.existsSyncbundledPath?}
  n6 --> n7
  n8[then]
  n7 -- yes --> n8
  n9[try block]
  n8 --> n9
  n10[catch]
  n9 -- error --> n10
  n11[ ]
  n9 --> n11
  n7 -- no --> n11
  n12[ ]
  n11 --> n12
  n5 -- no --> n12
  n13[try block]
  n12 --> n13
  n14[catch]
  n13 -- error --> n14
  n15([return: null])
  n13 --> n15
  n16([end])
  n15 --> n16
```

## Control flow: `FfmpegManager.installFfmpeg()`
```mermaid
flowchart TD
  n0([FfmpegManager.installFfmpeg])
  n1{this.isDownloading?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3[this.ui.infoFFmpeg download already in progress...]
  n2 --> n3
  n4([return: false])
  n3 --> n4
  n5[ ]
  n4 --> n5
  n1 -- no --> n5
  n6{binaryInfo?}
  n5 --> n6
  n7[then]
  n6 -- yes --> n7
  n8([return: false])
  n7 --> n8
  n9[ ]
  n8 --> n9
  n6 -- no --> n9
  n10{force and this.existingBinaryExistsffmpegDir, binaryInfo.executableName?}
  n9 --> n10
  n11[then]
  n10 -- yes --> n11
  n12[this.ui.infoFFmpeg is already installed.]
  n11 --> n12
  n13([return: true])
  n12 --> n13
  n14[ ]
  n13 --> n14
  n10 -- no --> n14
  n15[try block]
  n14 --> n15
  n16[catch error]
  n15 -- error --> n16
  n17[finally]
  n15 --> n17
  n18([end])
  n17 --> n18
```

## Control flow: `FfmpegManager.installFfmpegDarwinArm()`
```mermaid
flowchart TD
  n0([FfmpegManager.installFfmpegDarwinArm])
  n1{brewAvailable?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3{done?}
  n2 --> n3
  n4[then]
  n3 -- yes --> n4
  n5([return: true])
  n4 --> n5
  n6[ ]
  n5 --> n6
  n3 -- no --> n6
  n7[else]
  n1 -- no --> n7
  n8{decision cancel?}
  n7 --> n8
  n9[then]
  n8 -- yes --> n9
  n10([return: false])
  n9 --> n10
  n11[ ]
  n10 --> n11
  n8 -- no --> n11
  n12{decision brew?}
  n11 --> n12
  n13[then]
  n12 -- yes --> n13
  n14{installed?}
  n13 --> n14
  n15[then]
  n14 -- yes --> n15
  n16([return: true])
  n15 --> n16
  n17[ ]
  n16 --> n17
  n14 -- no --> n17
  n18[ ]
  n17 --> n18
  n12 -- no --> n18
  n19[ ]
  n6 --> n19
  n18 --> n19
  n20([return: this.downloadOsxExpe])
  n19 --> n20
  n21([end])
  n20 --> n21
```

## Control flow: `FfmpegManager.ensureFfmpeg()`
```mermaid
flowchart TD
  n0([FfmpegManager.ensureFfmpeg])
  n1{existingPath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3([return: existingPath])
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{autoInstall?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7{choice Yes?}
  n6 --> n7
  n8[then]
  n7 -- yes --> n8
  n9([return: installed ? await th])
  n8 --> n9
  n10[ ]
  n9 --> n10
  n7 -- no --> n10
  n11[else]
  n5 -- no --> n11
  n12[await this.ui.error FFmpeg is required. Install it or enable automatic installat]
  n11 --> n12
  n13[ ]
  n10 --> n13
  n12 --> n13
  n14([return: null])
  n13 --> n14
  n15([end])
  n14 --> n15
```

## Control flow: `FfmpegManager.downloadWithProgress()`
```mermaid
flowchart TD
  n0([FfmpegManager.downloadWithProgress])
  n1([return: new Promiseresolve, ])
  n0 --> n1
  n2([end])
  n1 --> n2
```

## Control flow: `FfmpegManager.verifyOsxArchive()`
```mermaid
flowchart TD
  n0([FfmpegManager.verifyOsxArchive])
  n1{expectedSha?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3([return: true])
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{expectedSha actualSha?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7([return: true])
  n6 --> n7
  n8[ ]
  n7 --> n8
  n5 -- no --> n8
  n9{proceed Continue?}
  n8 --> n9
  n10[then]
  n9 -- yes --> n10
  n11[try block]
  n10 --> n11
  n12[catch]
  n11 -- error --> n12
  n13([return: false])
  n11 --> n13
  n14[ ]
  n13 --> n14
  n9 -- no --> n14
  n15([return: true])
  n14 --> n15
  n16([end])
  n15 --> n16
```

## Control flow: `FfmpegManager.resolveBinary()`
```mermaid
flowchart TD
  n0([FfmpegManager.resolveBinary])
  n1{binaryInfo?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3{arch?.startsWitharm?}
  n2 --> n3
  n4[then]
  n3 -- yes --> n4
  n5[ ]
  n4 --> n5
  n3 -- no --> n5
  n6[ ]
  n5 --> n6
  n1 -- no --> n6
  n7{binaryInfo?}
  n6 --> n7
  n8[then]
  n7 -- yes --> n8
  n9[this.ui.errorUnsupported platform: $platform-$arch. Please install FFmpeg manual]
  n8 --> n9
  n10([return: null])
  n9 --> n10
  n11[ ]
  n10 --> n11
  n7 -- no --> n11
  n12([return: binaryInfo])
  n11 --> n12
  n13([end])
  n12 --> n13
```

## Control flow: `FfmpegManager.tryUseOrInstallBrew()`
```mermaid
flowchart TD
  n0([FfmpegManager.tryUseOrInstallBrew])
  n1[try block]
  n0 --> n1
  n2[catch]
  n1 -- error --> n2
  n3([end])
  n1 --> n3
```

## Control flow: `FfmpegManager.getVersion()`
```mermaid
flowchart TD
  n0([FfmpegManager.getVersion])
  n1{ffmpegPath?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3([return: Not installed])
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5[try block]
  n4 --> n5
  n6[catch]
  n5 -- error --> n6
  n7([end])
  n5 --> n7
```

## Control flow: `FfmpegManager.ensureDirectories()`
```mermaid
flowchart TD
  n0([FfmpegManager.ensureDirectories])
  n1{fs.existsSyncglobalStorage?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3[fs.mkdirSyncglobalStorage, recursive: true]
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{fs.existsSyncffmpegDir?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7[fs.mkdirSyncffmpegDir, recursive: true]
  n6 --> n7
  n8[ ]
  n7 --> n8
  n5 -- no --> n8
  n9([end])
  n8 --> n9
```

## Control flow: `FfmpegManager.promptInstallBrewOrFallback()`
```mermaid
flowchart TD
  n0([FfmpegManager.promptInstallBrewOrFallback])
  n1{installBrewChoice Install Homebrew?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3([return: brew])
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5{installBrewChoice Download Apple Silicon binary?}
  n4 --> n5
  n6[then]
  n5 -- yes --> n6
  n7([return: fallback])
  n6 --> n7
  n8[ ]
  n7 --> n8
  n5 -- no --> n8
  n9([return: cancel])
  n8 --> n9
  n10([end])
  n9 --> n10
```

## Control flow: `FfmpegManager.installBrewAndFfmpeg()`
```mermaid
flowchart TD
  n0([FfmpegManager.installBrewAndFfmpeg])
  n1{consent Install?}
  n0 --> n1
  n2[then]
  n1 -- yes --> n2
  n3([return: false])
  n2 --> n3
  n4[ ]
  n3 --> n4
  n1 -- no --> n4
  n5[try block]
  n4 --> n5
  n6[catch]
  n5 -- error --> n6
  n7([end])
  n5 --> n7
```

## Control flow: `FfmpegManager.downloadOsxExpertsFallback()`
```mermaid
flowchart TD
  n0([FfmpegManager.downloadOsxExpertsFallback])
  n1[try block]
  n0 --> n1
  n2[catch err]
  n1 -- error --> n2
  n3([end])
  n1 --> n3
```

## Control flow: `FfmpegManager.installOsxArchive()`
```mermaid
flowchart TD
  n0([FfmpegManager.installOsxArchive])
  n1[await this.extractArchiveosxArchive, ffmpegDir,]
  n0 --> n1
  n2{fs.existsSyncexecPath?}
  n1 --> n2
  n3[then]
  n2 -- yes --> n3
  n4([return: false])
  n3 --> n4
  n5[ ]
  n4 --> n5
  n2 -- no --> n5
  n6[try block]
  n5 --> n6
  n7[catch]
  n6 -- error --> n7
  n8[fs.chmodSyncexecPath, 0o755]
  n6 --> n8
  n9[await execFileAsyncexecPath, -version]
  n8 --> n9
  n10([return: true])
  n9 --> n10
  n11([end])
  n10 --> n11
```

## Control flow: `FfmpegManager.fetchOsxExpertsChecksum()`
```mermaid
flowchart TD
  n0([FfmpegManager.fetchOsxExpertsChecksum])
  n1([return: new Promiseresolve, ])
  n0 --> n1
  n2([end])
  n1 --> n2
```

## Control flow: `FfmpegManager.performInstallSteps()`
```mermaid
flowchart TD
  n0([FfmpegManager.performInstallSteps])
  n1[await this.ensureDirectoriesglobalStorage, ffmpegDir]
  n0 --> n1
  n2{isDarwinArm?}
  n1 --> n2
  n3[then]
  n2 -- yes --> n3
  n4{handled?}
  n3 --> n4
  n5[then]
  n4 -- yes --> n5
  n6([return: void])
  n5 --> n6
  n7[ ]
  n6 --> n7
  n4 -- no --> n7
  n8[ ]
  n7 --> n8
  n2 -- no --> n8
  n9[await this.downloadArchivebinaryInfo.url, archivePath, update]
  n8 --> n9
  n10[await this.extractAndCleanuparchivePath, ffmpegDir, binaryInfo.extractPath]
  n9 --> n10
  n11[await this.makeExecutableAndVerifyffmpegDir, binaryInfo.executableName, platform]
  n10 --> n11
  n12([end])
  n11 --> n12
```
