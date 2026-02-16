---
title: "iOS 设备指纹"
---
IDFV、IDFA、DeviceCheck

<!--more-->

## 0x1 iOS 设备指纹

Apple本身禁止应用利用设备属性、网络连接等信息作为设备指纹来识别用户设备，但是可以利用某些信息来作为设备指纹。这里列出普通应用能够读取并作为设备指纹的信息：


![fingerprint]({{ '/assets/images/fingerprint.png' | relative_url }})


1. IDFV(Identifier for Vendor)

    供应商标识符，iOS提供的一种设备标识符，通过 `UIDevice.current.identifierForVendor` 获取，格式为UUID。

    * 同一个开发者(Vendor)发布的所有App，在同一台设备上拿到的IDFV是相同的。不用开发者的App读取的值不同。
    
    * 用户卸载了该开发者在这台设备上的所有App，之后再重新安装，IDFV会重新生成。


2. IDFA(Identifier for Advertisers)
    
    广告标识符，iOS提供的一种设备标识符，通过 `ASIdentifierManager.shared().advertisingIdentifier` 获取，格式为UUID。
    
    * 同一台设备上，所有App拿到的IDFA都是同一个，不区分开发者。
    
    * 需要用户授权才能获取，拒绝授权时为返回全0的UUID(00000000-0000-0000-0000-000000000000)。

    * 用户可以在系统设置中主动关闭IDFA，再次打开IDFA后值会发生变化。

3. 应用安装目录

    应用安装时会保存在 `/var/containers/Bundle/Application/` 目录下的随机UUID子目录中，目录中的随机生成的UUID可作为设备指纹，应用升级或卸载重新安装时路径会发生变化。

4. 数据容器目录
   
    应用安装后会在 `/var/mobile/Containers/Data/Application` 目录下的随机UUID子目录中保存应用数据容器，目录中的随机生成的UUID可作为设备指纹，卸载重装时路径会发生变化，应用升级不会发生变化。

5. App Group目录

    App Group是iOS提供的一种应用间共享机制，设备上的同一个开发者下的多个App可以访问同一块共享的数据空间，路径在 `/var/mobile/Containers/Shared/AppGroup` 目录下的随机UUID子目录中，目录中的随机生成的UUID可作为设备指纹，只有在卸载同一个开发者下所有App时，App Group目录才会被删除，否则卸载单个App后重装，仍能读取到同一路径。

6. APNs Token

    APNs Token是iOS推送通知服务(Apple Push Notification service)为App分配的唯一地址，格式为64位字符串，开发者的服务器要往这台设备推送消息，必须要用这个Token请求APNs服务器。

    > iOS消息推送业务流程：
    >1. App调用 `UIApplication.shared.registerForRemoteNotifications()` 获取APNs Token。
    >2. App把Token上传到业务服务器。
    >3. 服务器要推送消息时，带着Token和消息内容请求APNs，APNs再转发到设备。

    * 同一设备上不同App的APNs Token不同。
    
    * 即使用户拒绝了通知权限，也能拿到APNs Token。
    
    * 卸载重新安装时APNs Token会发生变化。


7. iCloud Token

    和iCloud账号相关的Token，通过 `FileManager.default.ubiquityIdentityToken` 获取，其计算逻辑是和Apple ID、应用bundleID相关的一个哈希值。同一设备上登录相同的Apple ID时，在同一个应用内是同一个值。可作为设备指纹使用。

8. bootsessionuuid

    系统启动会话标识，通过 `sysctlbyname("kern.bootsessionuuid")` 获取，格式为UUID。

    * 同一台设备上，所有App获取到的值相同。
    
    * 手机重启后会发生变化。
    
    * iOS 17以下才能获取到，新版本限制返回结果。

9. 开机时间

    系统开启时间，通过 `sysctlbyname("kern.boottime")` 获取，可以精确到毫秒(2025-11-02T07:58:49.698Z)，有概率会重复，手机重启后会发生变化。

10. 文件系统卷创建时间

    手机文件系统的创建时间，通过 `URLResourceKey.volumeCreationDateKey` 读取，可以精确到毫秒，有概率会重复，只有在重置手机的时候才会变化。

## 0x2 DeviceCheck
以上所有指纹在手机恢复出厂设置后都会改变，目前普通应用无法获取到真正硬件相关的参数(序列号、MAC地址、IMEI等)来标识一台设备，但是可以利用Apple提供的DeviceCheck功能实现对一台设备进行永久标记，实现跨恢复出厂设置的设备状态。

Apple为每台设备、每个开发者账号保存2 bit状态。数据存储在Apple服务器中，业务服务器可以查询和设置设备状态。DeviceCheck只是提供设备状态查询和存储，不直接提供设备ID之类的标识符来标识某台设备。

Apple能够做到设备识别，是因为设备第一次开机或恢复出厂设置后，需要先向Apple服务器激活手机，这一步会采集设备的硬件信息，并使用独立的安全芯片Secure Enclave进行签名，Apple会对设备信息进行验证，确认是否是一台真实的设备，否则Apple会拒绝激活设备，设备无法正常使用。

激活成功后Apple会签发一个证书返回，证书签发者为 `CN=Basic Attestation User Sub CA1, O=Apple Inc., ST=California`，证书扩展(1.2.840.113635.100.10.1)中包含本机的硬件信息：
```shell
> openssl x509 -in deviceCheck.pem -noout -text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 1793773804128 (0x1a1a5401a60)
    Signature Algorithm: ecdsa-with-SHA256
        Issuer: CN=Basic Attestation User Sub CA1, O=Apple Inc., ST=California
        Validity
            Not Before: Nov  3 06:30:04 2026 GMT
            Not After : Jul 16 13:16:04 2027 GMT
        Subject: CN=4336249e9e79297f39133f4d51b3fe91fbffd942daea122f4fd5c28deb077a7c, OU=BAA Certification, O=Apple Inc., ST=California
        Subject Public Key Info:
            ...
        X509v3 extensions:
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Key Usage: critical
                Digital Signature, Non Repudiation, Key Encipherment, Data Encipherment
            1.2.840.113635.100.10.1: 
0...CHIP..........D.0...ECID...t..S.......c.0...bmac..38:89:2c:4f:30:XX.....i.0...imei..3548540905836XX.....d.0...meid..35485409058362.....m.0...srnm..F2LW41Q8JCXX.....d200..udid.(2cb6fe5e76feb..82fcacc2af340.....c.0...wmac..38:89:2c:4f:30:XX.....d:08..seid.0043B15C3654XX...11571EE53BF51477777
    Signature Algorithm: ecdsa-with-SHA256
         ...
```

| 字段 | 全称 | 含义 | 示例 |
|------|------|------|------|
| **CHIP** | Chip ID | SoC 芯片型号标识 | `0x8110` |
| **ECID** | Exclusive Chip ID | 每颗芯片唯一的 64 位 ID | `0x1455601a44401e` |
| **BORD** | Board ID | 主板/逻辑板配置标识 | `0x10` |
| **udid** | Unique Device Identifier | 设备唯一标识| `00008110-001455601A44401E` |
| **srnm** | Serial Number | 设备序列号 | `NHD7C59GYQ` |
| **imei** | IMEI | 国际移动设备识别码 | `354140917082675` |
| **meid** | MEID | 移动设备识别码 | `35485109738244` |
| **bmac** | Bluetooth MAC | 蓝牙 MAC 地址 | `2c:7c:f2:b5:13:59` |
| **wmac** | Wi-Fi MAC | Wi-Fi MAC 地址 | `2c:7c:f2:bf:70:af` |
| **seid** | Secure Element ID | 安全元件芯片唯一 ID | `041A4A5B5E1A9002...9D5102D5AA51BE` |


应用使用DeviceCheck功能需要先调用 `DCDevice.current.generateToken` 获取DeviceToken。

DeviceToken由系统进程devicecheckd生成，devicecheckd调用安全芯片Secure Enclave生成公私钥对，和Apple服务端协商出共享密钥，然后使用共享密钥对“激活证书+应用ID”进行AES加密，解密的结果就是DeviceToken，应用拿到DeviceToken其实无法解密其中内容，因为只有Apple服务端拥有密钥。

应用将DeviceToken发送给业务服务端，业务服务端使用DeviceToken调用Apple的DeviceCheck接口：query_two_bits（查询）、update_two_bits（更新）、validate_device_token（校验 token）。

DeviceCheck只能实现对设备进行标记，适合以下场景：
* 防止一台设备反复领取免费试用/新人优惠

* 标记作弊或羊毛党设备

使用DeviceCheck拉黑攻击者设备并不能完全阻止攻击，攻击者可以通过Hook进程devicecheckd替换当前设备的激活证书为未被风控设备的证书来绕过服务端风控，但DeviceCheck还是能提高攻击者的攻击成本。

## 0x3 References
[https://developer.apple.com/documentation/foundation/filemanager/ubiquityidentitytoken](https://developer.apple.com/documentation/foundation/filemanager/ubiquityidentitytoken)

[https://developer.apple.com/documentation/devicecheck](https://developer.apple.com/documentation/devicecheck)

[https://www.52pojie.cn/forum.php?mod=viewthread&tid=2114213&extra=page%3D1%26filter%3Dtypeid%26typeid%3D195](https://www.52pojie.cn/forum.php?mod=viewthread&tid=2114213&extra=page%3D1%26filter%3Dtypeid%26typeid%3D195)