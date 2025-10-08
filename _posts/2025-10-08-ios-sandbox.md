---
title: "iOS Sandbox沙盒机制"
---
Sandbox Profile、Sandbox Extension、libSandy、Sandbox Escape

<!--more-->

## 0x1 iOS Sandbox是什么

iOS Sandbox 是一种由内核(com.apple.security.sandbox模块)强制执行的访问控制机制，用于限制 App 对文件系统、进程、系统调用及其他资源的访问。

沙盒限制不仅对第三方App生效，对系统App也生效，防止系统App出现漏洞后，被该App的权限访问整个系统。

```c
              iOS 第三方 App
                    |
                    |
                  open()
                    |
                    v
              XNU Kernel
                    |
                    v
            VFS / MAC Framework
                    |
                    v
             Sandbox Policy
                    |
            +-------+-------+
            |               |
            v               v
     Sandbox Profile    进程运行时状态
            |               |
            |          Entitlements
            |          Sandbox Extensions
            |          Container 信息
            |               |
            +-------+-------+
                    |
                    v
             Sandbox 决策
                    |
             Allow / Deny
```

以文件读取为例，大致流程为：

1. App 通过 open() 发起文件访问。
2. 系统调用进入 XNU 内核。
3. 文件访问路径上的安全检查触发 MAC(Mandatory Access Control) Framework 的相关 Hook。
4. Sandbox 策略根据操作类型、目标路径和进程的安全上下文判断是否允许。

## 0x2 Sandbox Profile

Sandbox Profile是描述进程可以执行哪些操作的策略。
使用SBPL（Sandbox Profile Language）语言描述。例如：

```c
(deny default)

(allow file-read* (subpath "/System/Library"))
```
含义为：

- 默认动作为拒绝。
- 允许读取/System/Library及其子目录文件。

操作包括：

- `file*`：文件类操作。
- `process*`：进程类操作
- `sysctl*` ：sysctl命令
- …

条件包括：

- `(subpath-prefix "...")`：路径位于指定目录及其子目录。
- `(entitlement-is-bool-true ...)`：进程带有指定 Entitlement。
- `(signing-identifier "...")`：签名标识匹配指定程序。
- `(extension "...")` ：存在对应的Sandbox extension
- …

Sandbox Profile是以二进制格式存放在系统镜像中，可以使用[SandBlaster](https://github.com/cellebrite-labs/sandblaster)项目从ipsw提取。例如别人提取好的策略文件[container.sb](https://github.com/Lessica/iOS-Sandbox-Profiles/blob/main/profiles/20A362__iPhone11%2C2_4_6/builtin_collection/container/container.sb)

Sandbox Profile中的策略通常白名单策略，默认动作拒绝，只允许策略中符合条件的资源访问。

不同的文件操作可能会有不同的策略，以下三个操作为例：
  
1. `access()` 检测目录或文件是否存在
2. `stat()` 获取目录或文件属性
3. `open()` 读取文件的内容

在第三方App中测试不同的路径：

![文件路径测试]({{ '/assets/images/filepath_test.png' | relative_url }})

1. `stat()` 可以用来判断文件是否存在，例如判断越狱相关文件是否存在
2. 第三方App只能读取应用自身的安装目录和数据目录，无法读取其他应用的目录
3. 第三方App可以读取越狱根目录，前提是知道越狱根目录的文件路径 

## 0x3 Sandbox Extension

Sandbox Extension是一种动态授权机制，允许进程在不修改原有 Sandbox Profile 的情况下，获得对特定资源的额外访问权限。

```
Process A                       Process B
    |                               |
    | sandbox_extension_issue_file  |
    |                               |
    |----------- Token ------------>|
    |                               |
    |                               | sandbox_extension_consume()
    |                               |
```

工作流程：
1. 特权进程A通过sandbox_extension_issue_file生成Sandbox Extension Token
2. 将Token传递给目标进程B，可以通过XPC/Mach IPC等进程通信方式
3. 目标进程B Consume Token，获得额外的权限。

进程的Sandbox Extension存储在内核空间中，可以借助Dopamine提供的内核读取能力，读取指定进程的Sandbox Extension：
```
iPhone:~ mobile% sudo ./sandbox-extensions 42488
[sudo] password for mobile:
Kernel: com.apple.assets.read 4 /private/var/MobileAsset/AssetsV2/com_apple_MobileAsset_TTSAXResourceModelAssets
Kernel: com.apple.app-sandbox.read 3 /private/var/MobileAsset/AssetsV2/com_apple_MobileAsset_Trial_Siri_SiriTextToSpeech
Kernel: com.apple.app-sandbox.read 2 /private/var/mobile/Library/Trial/Treatments/406
Kernel: com.apple.app-sandbox.read 1 /private/var/mobile/Library/Trial/Treatments/SIRI_TEXT_TO_SPEECH
Kernel: com.apple.sandbox.executable -1 /private/var/containers/Bundle/Application/72DAB6E3-E197-468C-9E1A-299622760B72/Test.app
Kernel: com.apple.sandbox.container -1 /private/var/mobile/Containers/Data/Application/CAEC2965-757D-4BB9-80CD-735875E74AA5
PID 42488: 6 extensions, 4 classes; unlocked snapshot, build 20B110
```

## 0x4 [libSandy](https://github.com/opa334/libSandy)
在越狱环境下，基于Sandbox Extension扩展目标进程的权限。

libSandy由两部分组成：

1. 客户端库(libsandy.dylib):被 Tweak 链接,提供 `libSandy_applyProfile(...)` 之类的接口。
2. 守护进程(sandy):以 root、无沙盒身份运行,负责实际签发 extension。

其工作原理是向目标进程注入libsandy.dylib库，和守护进程sandy通信获取Sandbox Extension Token，最后消费Token获得特权。

使用libSandy给测试应用添加/var/mobile目录的读取权限：
![libSandy]({{ '/assets/images/libsandy.jpg' | relative_url }})

## 0x5 Sandbox Escape

攻击者利用系统漏洞，突破当前进程受到的Sandbox限制，获得原本不被允许的资源访问能力。例如读取其他应用数据目录、修改系统配置等。