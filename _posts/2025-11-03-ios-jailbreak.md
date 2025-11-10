---
title: "iOS越狱"
---
iOS Jailbreak、Dopamine、palera1n

<!--more-->

## iOS越狱是什么

iOS越狱（Jailbreak）是利用系统漏洞或其他特权能力，突破Apple对代码执行、文件系统、进程权限和软件安装等方面的限制，从而获得普通 iOS 应用无法使用的系统能力。

1. 读取任意文件目录

    iOS系统使用Sandbox Policy限制进程的文件访问，App只能访问自身应用安装目录和容器目录，以及部分系统目录，无法读取其他App目录，无法获取应用列表等信息。越狱后可绕过沙盒限制，读取任意文件目录：

    ![查看文件]({{ '/assets/images/filza.png' | relative_url }})

2. 安装任意程序

    iOS系统有代码签名验证，只允许运行苹果签名的程序，比如系统应用、App Store下载的App或者通过免费Apple ID签名的应用(只有7天有效期)。越狱后可突破该限制，安装ssh、frida等程序。

    ![ssh]({{ '/assets/images/ssh.jpg' | relative_url }})

1. Hook应用程序

    使用frida或Tweak插件来修改App内部运行逻辑。例如使用frida修改App读取到的设备机型：

    ![修改设备机型]({{ '/assets/images/spoof_hw_machine.jpg' | relative_url }})
    

## iOS越狱工具

iPhone能否越狱与CPU型号和系统版本有关，目前针对iOS 15及以上的系统版本，主流的越狱工具有以下几种：

- [Dopamine](https://ellekit.space/dopamine/)

  目前最主流的越狱工具，只需要在手机上安装Dopamine应用程序即可越狱，设备重启后需要重新执行越狱程序。

- [palera1n](https://palera.in/)
  
  只针对A8–A11老设备，利用不可通过软件更新修复的 `checkm8` BootROM 漏洞，每次越狱需要设备连接电脑引导，设备重启也需要连接电脑重新引导。

| CPU | 机型 | 最高可越狱版本 | 工具 |
| --- | --- | --- | --- |
| A9–A10 | iPhone 6s、7、SE 一代 | iOS 15.8.8 | Dopamine / palera1n |
| A11 | iPhone 8、8 Plus、X | iOS 16.7.16 | Dopamine / palera1n |
| A12 | iPhone XS、XR | iOS 18.7.1 | Dopamine |
| A13 | iPhone 11、SE 二代 | iOS 26.0.1 | Dopamine |
| A14 | iPhone 12 系列 | iOS 17.3.1 | Dopamine |
| A15 | iPhone 13、14 基础款、SE 三代 | iOS 17.3.1 | Dopamine |
| A16 | iPhone 14 Pro、15 基础款 | iOS 17.3.1 | Dopamine |
| A17 | iPhone 15 Pro 系列 | iOS 17.3.1 | Dopamine |

几点补充：
1. A11及之前的CPU架构为arm64，A11之后的CPU架构为arm64e，在arm64的基础上添加了指针签名保护(PAC)。目前arm64的设备均可越狱(包括iPad)，并且系统已经不再继续更新了，iPhone 8/X最后一个系统版本是16.7.16。

2. iOS系统系统降级受苹果签名严格限制，在新版本发布之后，旧版本的签名通道通常只保留几天到几周，关闭后就无法通过官方方式降级，所以不能将系统降级到可越狱的版本。

3. Dopamine需要通过应用侧载的方式安装，iOS版本在14.0 beta 2 - 16.6.1、16.7 RC (20H18)、17.0的，可以先安装巨魔(TrollStore)，再使用巨魔安装Dopamine，其他版本需要通过其他方式，例如使用免费Apple ID自签(7天到期)，或者使用付费的Apple开发者账号。

4. [Dopamine-roothide](https://github.com/roothide/Dopamine-roothide)在Dopamine的基础上，添加越狱环境隐藏功能，可选择应用单独隐藏越狱，但是开启隐藏越狱后无法注入插件。

5. 不论哪种越狱方式，都会安装越狱环境[Procursus](https://github.com/ProcursusTeam/Procursus)和包管理器(Sileo或Zebra)，Procursus负责提供基础的命令行工具、包管理器的底层(dpkg和apt)以及一些依赖库。包管理器可以添加软件仓库，安装别人开发好的软件。