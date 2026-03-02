---
title: "iOS 应用重打包"
---
应用侧载、SideStore、LiveContainer、代码签名

<!--more-->
## 0x1 应用重打包
iOS应用安装包为IPA格式，从Apple Store下载安装的应用会被FairPlay加密，无法直接逆向分析和修改，需要先脱壳，目前有两种脱壳方案：

* 内存导出：从内存中导出已经解密的内存页，使用frida-ios-dump、AppsDump3等工具。

* [fairplay-decrypt](https://github.com/EthanArbuckle/fairplay-decrypt)：从越狱设备中导出密钥，然后在电脑上离线解密IPA文件。

导出脱壳的IPA文件后，可以进行逆向分析、修改二进制、patch代码逻辑、注入dylib、替换资源等。

修改后的IPA文件无法直接运行，因为iOS系统存在[代码签名验证](/2025/12/15/ios-code-signature/#0x2-code-signature)，修改IPA后旧的签名会验证失败，必须重新签名才能设备上运行。

## 0x2 应用侧载

安装非Apple Store应用方式称为应用侧载（Sideloading），有以下几种侧载方式：

| 侧载方式         | 是否依赖合法签名 | 是否永久 | 限制     | 工具               |
| ------------ | -------- | ---- | ----------- | ------------------ |
| 开发者签名       | 是        | 否    | 免费账号3个应用，7天过期，限定设备 | [SideStore](https://github.com/SideStore/SideStore)、[impactor](https://github.com/claration/impactor) |
| 企业证书签名 | 否        | 是    |   无安装设备限制   |          |
| CoreTrust漏洞 | 否        | 是    | 只支持部分iOS系统     | [TrollStore](https://github.com/opa334/TrollStore)、[TrollFools](https://github.com/Lessica/TrollFools)         |
| LiveContainer        | 依赖宿主签名   | 依赖宿主 | 兼容性和性能限制    | [LiveContainer](https://github.com/LiveContainer/LiveContainer)      |

1. 开发者签名

    使用个人免费账号或付费开发者账号，必须先手机连接电脑，通过Apple官方的代码签名系统对IPA进行签名后会获得一个描述文件（Provisioning Profile），描述文件中绑定了手机的设备ID，对运行设备有限制。

    * 免费账号：有效期7天，单设备同时最多3个App。

    * 付费开发者账号（$99/年）：有效期1年，设备数量限制更宽松。

    基于开发者签名的安装工具本质都是模拟Xcode的安装过程。

    impactor是PC端侧载工具，可以在macOS、Linux和Windows上运行，并且能够在安装IPA时注入动态链接库dylib。

    ![impactor]({{ '/assets/images/impactor.jpg' | relative_url }}){: .resigning-screenshot}

    SideStore是手机端侧载工具，需要先通过PC端的侧载工具安装到手机上，会占用一个免费账号的App数量。安装后需要登录Apple ID获取开发者证书，然后使用VPN来模拟设备和电脑连接，安装和签名IPA时不需要再连接电脑。

    ![sidestore]({{ '/assets/images/sidestore.jpg' | relative_url }}){: .resigning-screenshot}


2. 企业证书签名

    使用企业开发者证书对IPA进行签名，不需要手机连接电脑，同样也是通过官方的代码签名系统，会得的一个可以在任意设备上安装的描述文件，手机上直接安装IPA后信任描述文件即可运行App。  

    ![enterprise]({{ '/assets/images/enterprise.jpg' | relative_url }}){: .resigning-screenshot}

3. CoreTrust漏洞

    利用[CoreTrust代码签名漏洞](/2026/01/07/trollstore/#0x2-coretrust%E4%BB%A3%E7%A0%81%E7%AD%BE%E5%90%8D%E6%BC%8F%E6%B4%9E)构造一个虚假的代码签名，绕过正常的签名检查，实现永久安装，支持系统版本14.0 beta 2 - 16.6.1, 16.7 RC (20H18)、17.0。
    
    TrollStore(巨魔)是基于该漏洞的应用签名和安装工具。TrollFools也是使用相同的原理，可以将动态库dylib直接植入到目标应用程序中，然后直接重新签名。

    ![trollfools]({{ '/assets/images/trollfools.png' | relative_url }}){: .resigning-screenshot}

4. LiveContainer

    LiveContainer采用在宿主进程内运行其他应用的方案，在安装IPA时，应用只是放到LiveContainer应用的数据目录下，并没有真正安装到iOS系统目录，启动目标应用时，通过dlopen把目标App加载进自己的进程空间，并跳转到它的入口点执行。

    LiveContainer本身也需要通过侧载工具安装，占用一个免费账号的App数量，LiveContainer并没有绕过代码签名验证，它会使用和安装自己一样的开发者证书给IPA签名。在LiveContainer可以安装任意数量的IPA，因为在Apple看来只有一个应用。
    
    LiveContainer也支持代码库注入。
    
    ![livecontainer]({{ '/assets/images/livecontainer.jpg' | relative_url }}){: .resigning-screenshot}


## 0x2 检测方案
1. Apple Store应用检测
    
    检测应用是否从Apple Store下载安装。

   * 是否存在描述文件
       
       描述文件位于应用安装包内的embedded.mobileprovision，是由Apple签名的授权文件，用来告诉iOS：这个App是谁开发的、允许在哪些设备上运行、可以使用哪些权限。
       
       App Store安装的应用中没有描述文件，如果存在描述文件，说明不是从Apple Store安装的应用。

    * 是否有FairPlay加密

       App Store安装的应用有FairPlay加密壳，主二进制的 `LC_ENCRYPTION_INFO(_64)` 中 `cryptid == 1`。脱壳后重签的包 `cryptid == 0`。
       
       并且App Store安装的应用有SC_Info目录，该目录和程序运行时解密壳有关。

2. 代码签名检测

    所有的应用侧载方式都会对应用进行重新签名，包括利用CoreTrust漏洞的巨魔，巨魔安装应用检测看[之前的文章](/2026/01/07/trollstore/#0x3-trollstore%E5%AE%89%E8%A3%85%E5%BA%94%E7%94%A8%E6%A3%80%E6%B5%8B)。这里只介绍其他几种侧载方式的签名检测。

    ![resigning]({{ '/assets/images/resigning.jpg' | relative_url }}){: .resigning-screenshot}

   * Team ID和Bundle ID是否更改

    使用证书重签名之后，签名中的Team ID和Bundle ID会发生变化，而且签名证书会从Apple分发证书变为开发者证书或企业证书，如果是开发者证书，还会显示出开发者的Apple ID。

   * Entitlements包含异常选项

    使用开发者证书签名的应用，Entitlements会包含 `get-task-allow`，该entitlement是用于代码调试使用的，Apple Store安装应用一定不会有这个选项。

    * CDHash是否发生变化

    CDHash是代码签名中记录应用中二进制程序和资源文件的哈希值，如果发现CDHash发生变化，说明应用被窜改了。

3. LiveContainer检测

    LiveContainer安装的应用有以下几个检测特征：

    * 代码签名中的Code directory部分的identifier是LiveContainer应用的ID：com.kdt.livecontainer.XXXXX。

    * 应用安装目录和容器数据目录位于LiveContainer的容器数据目录内。
  
    * LiveContainer会给应用注入代码库LiveContainerShared，即使在设置中关闭Tweak注入。

    ![livecontainer_signal]({{ '/assets/images/livecontainer_signal.jpg' | relative_url }}){: .resigning-screenshot}


4. 代码注入检测

    重打包检测和代码注入检测有重叠， 应用重打包可能会注入代码库，但不是必须的，攻击者重打包应用可能只是为了应用多开。而且代码注入也不一定是通过重打包实现，越狱设备可以实现对任意应用进行代码注入。

## 0x3 References
[https://github.com/EthanArbuckle/fairplay-decrypt](https://github.com/EthanArbuckle/fairplay-decrypt)

[https://github.com/SideStore/SideStore](https://github.com/SideStore/SideStore)

[https://github.com/opa334/TrollStore](https://github.com/opa334/TrollStore)

[https://github.com/Lessica/TrollFools](https://github.com/Lessica/TrollFools)

[https://github.com/LiveContainer/LiveContainer](https://github.com/LiveContainer/LiveContainer)