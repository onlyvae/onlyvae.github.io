---
title: "iOS 代码签名机制"
---
Provisioning Profiles、Code Signature、AMFI、TrustCache

<!--more-->
## 0x1 Certificates

正常iOS上运行的App必须要有证书签名，并且证书是由苹果签名过的证书，否则无法运行，不同应用分发方式使用不同类型的代码签名证书。

|分发方式|签名证书|需要审核|设备限制|说明|
|------|------|------|------|------|
|Development	|开发证书	|否|是|Xcode开发调试时使用。
|Ad Hoc	|Apple发布证书	|否|是|有设备限制。只能在指定UDID的设备上运行。
|TestFlight	|Apple发布证书	|是|否|应用上线App Store前的公测/内测。
|App Store	|Apple发布证书	|是|否|
|Enterprise In-House |企业证书	|否|否|企业内部使用，无数量限制。

* 免费账号的开发证书最多只能同时签发3个App，证书7天过期，需定期刷新，SideStore、AltStore之类的应用侧载工具都是基于此。

* App提交App Store审核之后，App Store会使用Apple发布证书对应用进行重新签名，并且对应用加壳。

* 网络上售卖的App签名服务，需要提供自己设备UDID的通常是Ad Hoc的分发方式。


证书中主要包括以下几部分：
1. Issuer： 证书签发者，通常为Apple的中间证书

2. Validity： 生效和失效日期

3. Subject： 签发对象，个人开发证书会显示Apple ID账号和名称

4. Subject Public Key： 签发对象的公钥

```shell
> openssl x509 -in developer.cer -inform der -text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            29:b7:de:69:ca:0c:f6:2b:1d:90:8a:43:e8:65:68:fa
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = Apple Worldwide Developer Relations Certification Authority, OU = G3, O = Apple Inc., C = US
        Validity
            Not Before: Jan 28 06:41:47 2026 GMT
            Not After : Jan 28 06:41:46 2027 GMT
        Subject: UID = XXXXXXXX, CN = Apple Development: XXXXXX@XXXX.com (XXXXXX), OU = XXXXXX, O = XXXXX, C = US
        Subject Public Key Info:
            ...
        X509v3 extensions:
            ...
    Signature Algorithm: sha256WithRSAEncryption
    Signature Value:
        32:1b:06:da:9d:cc:b7:0d:59:bc:2c:5a:a2:c3:34:42:ee:f1:
        ...
```

证书无法用来直接对代码进行签名，需要使用私钥才能对代码进行签名，系统运行时使用证书中的公钥来验证签名是否有效。私钥+证书组合在一起称为digital identity，使用PKCS#12格式存储，后缀为.p12。

## 0x2 Code Signature

代码签名存放在Mach-O文件中，使用 `LC_CODE_SIGNATURE` load command命令加载。

![代码签名]({{ '/assets/images/code_signature.jpg' | relative_url }})

### 0x2_1 CODE_DIRECTORY
CodeDirectory记录了被签名程序的所有关键哈希信息。系统通过验证CodeDirectory的完整性，来确认整个可执行文件、资源、Info.plist、entitlements等是否被篡改。

```shell
> codesign --display -vvvvvv iosapp_sec_study.app
...
CodeDirectory v=20400 size=696 flags=0x0(none) hashes=11+7 location=embedded
Hash type=sha256 size=32
CandidateCDHash sha256=d2fd77ff616f665f84c5764057efa51508ec2f31
CandidateCDHashFull sha256=d2fd77ff616f665f84c5764057efa51508ec2f31ac5879a661d20640fd48b610
Hash choices=sha256
...
Page size=16384
    -7=87f76d413101bd671d4b2f3cab761ab8ad771742fd6968221f0f0e2d9b206c9e
    -6=0000000000000000000000000000000000000000000000000000000000000000
    -5=882cbc43aef244cb60ddc1e99abe02f076d81a02cfc7297a9f387c16e4b5db5c
    -4=0000000000000000000000000000000000000000000000000000000000000000
    -3=013e87a6ea57b328fbc8b88494c160bc81edc71d8464c9b607047964fd036d1d
    -2=74d7fe67744bd2a63f3e461a6a0e515b32db00b17c995d77c9c4aa7bf62bd49a
    -1=e08ed90eed72bd01d3a8031f69edadee12c8ef8d86c8cd464e6b9dbdca83efd6
     0=c0c4deff54c57746abfd651ff8cf55fa2b003dc4c533a9f7b4ba8fc3630b4c98
     1=34ea2e0972f1c5bec17949a11fab8880067e0909e4b26da93d85bec904c4c3fd
     2=e319c2f9f2e3947d40399cfdf0d85e7f2a642e0ddab1d448caefabf7da2e9883
     3=edb3f15050e97e1600a9fb8a9bf823f087c47efd91d3e828c9c09f396d24d805
     4=21333314d04d45844addc44cabb394d628b7729c2819270352487d936880f423
     5=9359e4cb41ca79b0d4dfd27665e1d3d148b87ecd82ec9f47f42703240fcdccf4
     6=a390f3f978b08a73c68137e9f7380716c2d099011bb95aaba844b3da6c54c907
     7=2bbd0b04255d00f29175725924a020514742aaa9e530c756b4066bdbbe96e446
     8=5cfb5b760adc0958430f9b6723c7b2120979f0df856ad244e65ea133e8815fff
     9=a94644d33b2e153f2443fdfb91974073f846b9b7a3fdf31bb480a73327b00064
    10=c5daefa31efeeca75a5cc4ce15d58012188dd96a8cc8727e1dcb5160c31cf66f
CDHash=d2fd77ff616f665f84c5764057efa51508ec2f31
Signature size=4783
Authority=Apple Development: XXXXX@XXXX.com (XXXXX)
Authority=Apple Worldwide Developer Relations Certification Authority
Authority=Apple Root CA
...

```
    
示例中的CodeDirectory有11个代码哈希和特殊哈希，哈希算法为SHA-256：
* 代码哈希(非负下标)：将Mach-O中的代码段根据Page size(16384)分成11个Page，对每个Page进行计算哈希运算。系统在加载当前应用的某一Page代码时，会对这一页的代码进行哈希验证。
  
* 特殊哈希(负下标)：-1是Info.plist文件的哈希值，-3是资源文件的哈希值，-5是Entitlements的哈希值。

    ```shell
> shasum -a 256 iosapp_sec_study.app/Info.plist
e08ed90eed72bd01d3a8031f69edadee12c8ef8d86c8cd464e6b9dbdca83efd6  iosapp_sec_study.app/Info.plist
```

CDHash是使用相同哈希算法对整个CodeDirectory进行哈希运算结果的前20个字节，系统使用该值来唯一标识当前程序。
    
Mach-O文件中允许存在多个使用不同哈希算法的CodeDirectory，这是为了兼容旧系统(SHA-1)，因此会存在多个CodeDirectory，多个CDHash的情况。


### 0x2_2 ENTITLEMENTS和DER_ENTITLEMENTS

Entitlements声明App被授权使用哪些受保护的系统能力。没有对应的Entitlement，即使代码调用了相关 API，系统也会拒绝。

```xml
> codesign --display --entitlements - --xml iosapp_sec_study.app | plutil -convert xml1 -o - -
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
        <key>application-identifier</key>
        <string>XXXXXXXX.ios.iosapp-sec-study</string>
        <key>com.apple.developer.team-identifier</key>
        <string>XXXXXXXX</string>
        <key>com.apple.security.application-groups</key>
        <array>
                <string>group.ios.iosapp-sec-study</string>
        </array>
        <key>get-task-allow</key>
        <true/>
</dict>
</plist>
```

  * application-identifier: 声明App身份(Team ID + Bundle ID)。

  * com.apple.developer.team-identifier: 声明所属团队。

  * get-task-allow: 允许其他进程获取本进程的task port，即允许被调试器attach。

  * com.apple.security.application-groups: 允许访问group.ios.iosapp-sec-study共享容器，用于 App 与扩展共享数据。

ENTITLEMENTS是XML plist格式，DER_ENTITLEMENTS是DER(ASN.1)二进制编码，两者内容等价，只是格式不一样。

### 0x2_3 SIGNATURE_SLOT
  
真正的数字签名数据，格式为Cryptographic Message Syntax(CMS)。是对CodeDirectory的签名，如果没有这个签名，攻击者可以修改代码后，再修改对于代码页的CodeDirectory，完全绕过程序完整性验证。

```
> codesign --display --dump-cms=cms.asn1 ./iosapp_sec_study.app
> openssl asn1parse -in cms.asn1 -inform der -i
    0:d=0  hl=2 l=inf  cons: SEQUENCE
    2:d=1  hl=2 l=   9 prim:  OBJECT            :pkcs7-signedData
   13:d=1  hl=2 l=inf  cons:  cont [ 0 ]
   ...
```

结构为：
```
ContentInfo
├─ contentType: pkcs7-signedData
└─ SignedData
    ├─ version: 1
    ├─ digestAlgorithms: SHA-256
    ├─ encapContentInfo: 分离签名，Apple代码签名约定实际签名内容为第一个CodeDirectory的摘要
    ├─ certificates: 签名证书，包括完整的证书链
    └─ signerInfos: 签名信息
      └─ SignerInfo
         ├─ version: 1
         ├─ sid: IssuerAndSerialNumber
         │  ├─ issuer: 签发者
         │  └─ serialNumber: 证书序列号，说明是certificates中的哪一个证书签名的
         ├─ signedAttrs
         │  ├─ contentType: pkcs7-data
         │  ├─ signingTime
         │  ├─ messageDigest: 第一个CodeDirectory的哈希摘要
         │  ├─ 1.2.840.113635.100.9.2: （Apple私有属性）保存(哈希算法 OID， 完整哈希) 对，每个CodeDirectory对应一项
         │  └─ 1.2.840.113635.100.9.1: （Apple私有属性）使用XML plist格式列出所有CodeDirectory的CDHash
         ├─ signatureAlgorithm: sha256WithRSAEncryption
         └─ signature: 签名值
```

签名数据的验证步骤大致为：
1. 确认签名证书

    根据SignerInfo里的issuer + 序列号，在certificates里找到叶子证书，取出公钥，并验证证书链。

2. 验证messageDigest

    对被签名的数据(CodeDirectory)使用digestAlgorithms计算哈希值，和signedAttrs里的messageDigest比对。

    注意：messageDigest的值是第一个CodeDirectory的哈希摘要，如果有多个CodeDirectory的情况时，每个CodeDirectory的哈希摘要会被放在signedAttrs中的Apple私有属性中，会在下一步验证中保护。

3. 用公钥验证签名值

    对signedAttrs使用digestAlgorithms计算哈希值，和用签名证书中公钥对signature解密结果进行比对。

如果存在多个SignerInfo，会对每一个SignerInfo重复上面的验证过程。Trollstore就是利用系统在处理具有多个签名者的代码签名时存在验证缺陷，实现代码签名验证的绕过。

## 0x3 Provisioning Profiles
代码签名解决的是程序的完整性、签名身份(开发者)以及相关安全声明，而描述文件(Provisioning Profile)是由Apple签名的授权文件，用来告诉iOS：这个App是谁开发的、允许在哪些设备上运行、可以使用哪些权限。

描述文件位于应用安装包内的embedded.mobileprovision，其中包含授权的开发者证书、App ID、entitlements、有效期、设备ID。

![描述文件]({{ '/assets/images/mobileprovision.png' | relative_url }})

* Development和Ad Hoc分发方式有设备ID限制，其他分发方式不限制运行设备
* App Store下载的安装包中没有描述文件，因为App Store会在其分发过程中检查应用是否已正确签名和配置。

## 0x4 AMFI
AMFI(Apple Mobile File Integrity)是iOS系统中负责代码签名验证与授权执行的核心安全组件。决定一个程序是否被系统信任、是否允许执行，以及它能够获得哪些与代码签名相关的权限。

AMFI运行在内核模块com.apple.driver.AppleMobileFileIntegrity中，在进程执行、内存映射等关键节点做安全检查。工作流程大致如下：

```
  进程尝试 exec
        │
        ▼
  MACF 触发 AMFI policy hook
        │
        ▼
  取出 Code Signature，计算 CDHash
        │
        ▼
  CDHash 是否在 Trust Cache?
  ├─ 是 → 跳到 entitlements 检查
  └─ 否 ↓
        │
  证书和签名验证
        │
  provisioning profile 校验(有效期/UDID/revoke)
        │
        ▼
  entitlements 校验(与 profile 声明一致)
        │
        ▼
  非系统/非 App Store 签名？→ 检查 Developer Mode
        │
        ▼
  全部通过 → 允许执行
  任一失败 → 拒绝，记录 AMFI 日志
```

1. 提取Code Signature
   
   内核解析Mach-O文件，找到 `LC_CODE_SIGNATURE` load command，取出其中的CodeDirectory、代码签名、Entitlements等。

2. 计算并比对CDHash
   
   用CodeDirectory算出该二进制的唯一标识CDHash。

3. 查询Trust Cache
   
   内核维护的Trust Cache记录了一批预先信任的CDHash(主要是系统自带二进制)。
   - **命中**: 直接判定为可信，跳过后续证书链校验，流程走到第6步(entitlements检查)。
   - **未命中**: 进入第4步。

4. 证书和签名验证
   
   对于未在Trust Cache中的二进制(第三方App、开发者签名、企业签名、Ad Hoc等)，AMFI需要验证代码签名和证书链是否可信，具体是调用另一个内核模块CoreTrust完成代码签名和证书链解析。

5. Provisioning Profile校验(针对开发/企业/Ad Hoc 签名)
   
   - 检查二进制携带的Provisioning Profile是否有效(未过期、签名未被吊销)。
   - 检查当前设备UDID是否在Profile的授权设备列表中。

6. Entitlements 校验
   
   解析二进制签名中声明的entitlements(如访问钥匙串、调试权限、后台权限、私有框架访问权限等)。比对这些entitlements是否被允许:
     - 系统二进制的entitlements由于在Trust Cache中已被信任，通常直接放行;
     - 第三方应用的entitlements必须与其Provisioning Profile中声明的权限集合一致，不能"自己声明了但 profile没授权"的权限。
   
   一些高敏感entitlement(如 `get-task-allow`、某些私有 entitlement)即使profile允许，也可能受"开发者模式"状态等额外策略约束。

7. 开发者模式检查(iOS 16+)
   
   对于非App Store签名、非系统签名的二进制(即开发者签名/Ad Hoc 等)，AMFI 会检查设备是否已开启 Developer Mode。未开启时直接拒绝运行，并提示用户去设置里启用。

8. 决策与返回
   
   以上任一环节失败，AMFI都会让对应的系统调用失败。

## 0x5 越狱相关

越狱需要突破AMFI的代码签名与安全策略，让苹果原本不信任的程序、动态库和注入代码能够运行。

Dopamine会在越狱时，将越狱基础组件的代码签名添加到Trust Cache中。

对于越狱后安装的程序和动态库dylib，分别会Hook进程启动函数和dyld加载函数，将目标文件的代码签名添加到Trust Cache中。

可以用 `jbctl trustcache` 命令来查看/新增CDHash。


```shell
iPhone:~ mobile% jbctl
Usage: jbctl <command> <arguments>
Available commands:
        proc_set_debugged <pid>         Marks the process with the given pid as being debugged, allowing invalid code pages inside of it
        trustcache info                 Print info about all jailbreak related trustcaches and the cdhashes contained in them
        trustcache clear                Clears all existing cdhashes from the jailbreaks trustcache
        trustcache add <cdhash>         Add an arbitrary cdhash to the jailbreaks trustcache
        update <tipa/basebin/tarball> <path>    Initiates a jailbreak update either based on a TIPA, based on a basebin.tar file or based on a standalone tarball, TIPA installation depends on TrollStore, afterwards it triggers a userspace reboot
iPhone:~ mobile% sudo jbctl trustcache info
[sudo] password for mobile:
Jailbreak Trustcache 0 <UUID: 8AE914AFBFE640A8BFCA01197C662424> (length: 53)
| 1:    03716B70B3CFFFF73BE08F4CF140322236C8A00A
| 2:    0B21F869091308B899EF0DB5822E1C0B3DE8A39F
...
```

## 0x6 Reference
https://developer.apple.com/documentation/technotes/tn3161-inside-code-signing-certificates
https://developer.apple.com/documentation/technotes/tn3126-inside-code-signing-hashes
https://developer.apple.com/documentation/technotes/tn3125-inside-code-signing-provisioning-profiles
