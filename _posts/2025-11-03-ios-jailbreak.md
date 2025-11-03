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

目前针对iOS 15及以上的系统版本，主流的越狱工具有以下几种：

- [Dopamine](https://ellekit.space/dopamine/)

  目前最主流的越狱工具，只需要在手机上安装Dopamine应用程序即可越狱，设备重启后需要重新执行越狱程序。

- [palera1n](https://palera.in/)
  
  只针对A8–A11老设备，利用不可通过软件更新修复的 `checkm8` BootROM 漏洞，需要设备连接电脑引导越狱。

| 设备芯片 | 代表机型 | 最高可越狱版本 | 工具 |
| --- | --- | --- | --- |
| A9–A10 | iPhone 6s、7、SE 一代 | iOS 15.8.8 | Dopamine / palera1n |
| A11 | iPhone 8、8 Plus、X | iOS 16.7.16 | Dopamine / palera1n |
| A12 | iPhone XS、XR | iOS 18.7.1 | Dopamine |
| A13 | iPhone 11、SE 二代 | iOS 26.0.1 | Dopamine |
| A14 | iPhone 12 系列 | iOS 17.3.1 | Dopamine |
| A15 | iPhone 13、14 基础款、SE 三代 | iOS 17.3.1 | Dopamine |
| A16 | iPhone 14 Pro、15 基础款 | iOS 17.3.1 | Dopamine |
| A17 | iPhone 15 Pro 系列 | iOS 17.3.1 | Dopamine |

当前iPhone X以下的设备均可越狱，系统已经不在继续更新了，iPhone X最后一个系统版本是16.7.16。

[Dopamine-roothide](https://github.com/roothide/Dopamine-roothide)在Dopamine的基础上，添加越狱环境隐藏功能，可选择应用单独隐藏越狱。

不论哪种越狱方式，都会安装越狱环境[Procursus](https://github.com/ProcursusTeam/Procursus)，Procursus负责提供基础的类Unix工具、包管理器的底层(dpkg和apt)以及基础库和依赖。最后才可以通过Sileo或Zebra来安装各种插件。