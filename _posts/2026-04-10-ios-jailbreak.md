---
title: "iOS 越狱"
---
Dopamine、palera1n

<!--more-->

## 0x1 iOS越狱是什么

iOS越狱（Jailbreak）是利用系统漏洞或其他特权能力，突破Apple对代码执行、文件系统、进程权限和软件安装等方面的限制，从而获得普通 iOS 应用无法使用的系统能力。

1. 突破沙盒限制

    iOS系统使用Sandbox Policy限制进程的文件访问，App只能访问自身应用安装目录和容器目录，以及部分系统目录，无法读取其他App目录，无法获取应用列表等信息。越狱后可绕过沙盒限制，读取任意文件目录：

    ![查看文件]({{ '/assets/images/filza.webp' | relative_url }}){: .jailbreak-screenshot}

2. 突破代码签名验证

    iOS系统有代码签名验证，只允许运行苹果签名的程序，比如系统应用、App Store下载的App或者通过免费Apple ID签名的应用(只有7天有效期)。越狱后可突破该限制，安装ssh、frida等程序。

    ![ssh]({{ '/assets/images/ssh.webp' | relative_url }})

3. Hook应用程序

    使用frida或Tweak插件来修改App内部运行逻辑。例如使用frida修改App读取到的设备机型：

    ![修改设备机型]({{ '/assets/images/spoof_hw_machine.webp' | relative_url }}){: .jailbreak-screenshot}
    

设备能否越狱与CPU型号和系统版本有关，更新的CPU型号和系统版本更难越狱，而且iOS系统降级受苹果签名严格限制，在新版本发布之后，旧版本的签名通道通常只保留几天到几周，关闭后就无法通过官方方式降级，所以不能将系统降级到可越狱的版本。目前针对iOS 15及以上的越狱工具是Dopamine和palera1n。下面分别介绍其工作原理和检测方案。

## 0x2 Dopamine

[Dopamine](https://ellekit.space/dopamine/)是目前最流行的越狱工具，支持的设备和系统范围最广，利用系统漏洞实现越狱。

| CPU | 机型 | 最高可越狱版本 |
| --- | --- | --- | --- |
| A9 | iPhone 6s、SE 一代 | iOS 15.8.8 | 
| A10 | iPhone 7、7 Plus | iOS 15.8.8 | 
| A11 | iPhone 8、8 Plus、X | iOS 16.7.16 | 
| A12 | iPhone XS、XR | iOS 18.7.1 | 
| A13 | iPhone 11、SE 二代 | iOS 26.0.1 | 
| A14 | iPhone 12 系列 | iOS 17.3.1 | 
| A15 | iPhone 13、14 基础款、SE 三代 | iOS 17.3.1 | 
| A16 | iPhone 14 Pro、15 基础款 | iOS 17.3.1 |
| A17 | iPhone 15 Pro 系列 | iOS 17.3.1 | 

* A11及之前的CPU架构为arm64，A11之后的CPU架构为arm64e(在arm64的基础上添加了指针签名保护)。arm64的设备均可越狱(包括iPad)，并且系统已经不再继续更新了，例如iPhone 8/X最后一个系统版本是16.7.16。


Dopamine越狱需要先在手机上安装Dopamine应用，低版本iOS可以先安装巨魔(TrollStore)，再使用巨魔安装Dopamine，其他版本需要通过其他应用侧载方式，例如使用免费Apple ID自签(7天到期)，或者使用付费的Apple开发者账号。手机重启后需要重新在应用中点击越狱。


![dopamine]({{ '/assets/images/dopamine.webp' | relative_url }}){: .jailbreak-screenshot}


### 0x2_1 实现原理
Dopamine利用系统漏洞来实现内核特权，然后Hook用户空间进程，在运行任意程序时，动态添加程序的CDHash到系统信任库Trustcache中，实现代码签名绕过。

具体工作流程：

1. 内核漏洞利用
   
   根据设备和版本选择合适的漏洞，获得内核读写原语（kernel r/w）。

2. 建立特权服务

    向launchd注入launchdhook，在launchd中运行jbserver，jbserver统一持有内核读写、信任缓存管理、沙盒扩展等特权操作。

    > launchd是内核初始化完成后启动的第一个进程，PID为1，负责启动各类系统守护进程，大部分进程的父进程都是launchd。

3. 进程注入与运行时
    
    * dyldhook：注入动态链接器dyld，负责向jbserver注册，jbserver让当前进程能够访问越狱环境(通过[沙盒扩展](/2025/10/08/ios-sandbox/#0x5-sandbox-escape))、调整进程代码页验证状态。
    
    > dyld负责加载进程依赖的动态库、解析外部符号地址、执行各镜像中的初始化代码。

    * systemhook：注入应用进程，读取dyldhook留下的登记结果，加载插件TweakLoader。

4. 越狱环境安装
    
    安装[Procursus](https://github.com/ProcursusTeam/Procursus)越狱环境并链接到/var/jb，以及包管理器(Sileo或Zebra)，Procursus负责提供基础的命令行工具、包管理器的底层(dpkg和apt)以及一些依赖库；包管理器可以添加软件仓库，安装ssh、frida等工具。


### 0x2_2 检测方法

根据以上工作流程，可以从以下几个方面检测越狱：

1. dyldhook检测
   
    Dopamine会对原始dyld进行patch，并且与dyldhook合并成新的dyld。从其代码实现中得出以下检测特征：

   * dyld符号链接检测

      /usr/lib/dyld文件被替换为符号链接指向越狱环境procursus中的修改后的dyld

      ```shell
      iPhone:~ mobile% ls -l /usr/lib/dyld
      lrwxr-xr-x 1 root wheel 156 Nov 10 00:40 /usr/lib/dyld -> /private/preboot/B6B67083C338EAC91561B9860C044CA96DC4821FCFCD93E20F688240C30E94D9DE09410A41CE3F911FAEF2986E9E0B60/dopamine-8AXnA3/procursus/basebin/gen/dyld*
      ```

   * dyld的UUID包含DOPA+版本号

      修改后dyld的Mach-O文件头中UUID被修改为“DOPA”+Dopamine版本号：

      >[basebin_gen.m#L151-L153](https://github.com/opa334/Dopamine/blob/5b1d2c1c3bf54dd8e3641d29c60cd3a0c13cde88/BaseBin/libjailbreak/src/basebin_gen.m#L151-L153)
      >```c
      >NSString *dyldUUIDPrefix = [@"DOPA" stringByAppendingString:dopamineVersion];
      >if (apply_dyld_patch(dyldInflightPath, dyldUUIDPrefix.UTF8String) != 0) return 2;
      >if (merge_dyldhook(dyldInflightPath, dyldhookMergeDylibPath, dyldInflightPath) != 0) return 3;
      >```

      可以从内存中解析dyld的Mach-O镜像，读取LC_UUID：
      ```shell
      > otool -l dyld | grep -A 2 LC_UUID
          cmd LC_UUID
      cmdsize 24
          uuid 444F5041-332E-302E-3133-001B44ACDE0C

      > echo "444F5041332E302E3133001B44ACDE0C"|xxd -r -p
      DOPA3.0.13
                ��
                  % 
      ```

   * Match-O中存在__DATA,__jbinfo
   
      dyldhook会在__DATA segment中创建__jbinfo section：
      
      >[main.c#L14-L15](https://github.com/opa334/Dopamine/blob/5b1d2c1c3bf54dd8e3641d29c60cd3a0c13cde88/BaseBin/dyldhook/src/main.c#L14-L15)。
      >```c
      >__attribute__((section("__DATA,__jbinfo"))) static char jbinfoSection[0x4000];
      >#define jbInfo ((struct dyld_jbinfo *)&jbinfoSection[0])
      >```

      该部分用于存放越狱信息，后续systemhook.dylib会读取该部分数据。可以从内存中解析dyld的Mach-O镜像，判断是否存在该segment。

      ```shell
      > otool -l dyld | grep -A 2 __jbinfo      
        sectname __jbinfo
        segname __DATA
            addr 0x0000000000094000
      ```
   
   * dyld启动入口PC被修改

      dyldhook会将dyld的启动入口被修改到到 `_MACHOMERGER_START_HOOK` 函数：
      >[UnixThread.swift#L24-L31](https://github.com/opa334/Dopamine/blob/5b1d2c1c3bf54dd8e3641d29c60cd3a0c13cde88/BaseBin/MachOMerger/Sources/MachOMerger/UnixThread.swift#L24-L31) 
      >```c
      >var thA64 = th.state.getGeneric(type: arm_thread_state64_t.self)
      >thA64.__pc = relocInfo.translate(address: thA64.__pc, isB: isB)
      >if let st = try? b.getSymbolTable() {
      >    if let newStart = st.symbol(forName: "_MACHOMERGER_START_HOOK") {
      >        thA64.__pc = relocInfo.translate(address: newStart.value, isB: true)
      >    }
      >}
      >```

      可以从内存中解析dyld的Mach-O镜像，读取LC_UNIXTHREAD load command中的pc寄存器地址，然后解析该地址的符号是否是 `_MACHOMERGER_START_HOOK`。
      ```shell
      > otool -l dyld | grep -A 15 LC_UNIXTHREAD
              cmd LC_UNIXTHREAD
          cmdsize 288
          flavor ARM_THREAD_STATE64
            count ARM_THREAD_STATE64_COUNT
                  x0  0x0000000000000000 x1  0x0000000000000000 x2  0x0000000000000000
                  x3  0x0000000000000000 x4  0x0000000000000000 x5  0x0000000000000000
                  x6  0x0000000000000000 x7  0x0000000000000000 x8  0x0000000000000000
                  x9  0x0000000000000000 x10 0x0000000000000000 x11 0x0000000000000000
                  x12 0x0000000000000000 x13 0x0000000000000000 x14 0x0000000000000000
                  x15 0x0000000000000000 x16 0x0000000000000000 x17 0x0000000000000000
                  x18 0x0000000000000000 x19 0x0000000000000000 x20 0x0000000000000000
                  x21 0x0000000000000000 x22 0x0000000000000000 x23 0x0000000000000000
                  x24 0x0000000000000000 x25 0x0000000000000000 x26 0x0000000000000000
                  x27 0x0000000000000000 x28 0x0000000000000000  fp 0x0000000000000000
                  lr 0x0000000000000000 sp  0x0000000000000000  pc 0x0000000000085270
                cpsr 0x00000000
      
      > nm dyld|grep 0000000000085270  
      0000000000085270 T _MACHOMERGER_START_HOOK
      ```

   * 合并后dyld包含多个替换后的Mach-O header

      在合并dyld和dyldhook时，会将Mach-O的magic替换为0xd0d0d0d0：

      >[main.swift#L183-L209](https://github.com/opa334/Dopamine/blob/5b1d2c1c3bf54dd8e3641d29c60cd3a0c13cde88/BaseBin/MachOMerger/Sources/MachOMerger/main.swift#L183-L209)
      >```swift
      >let magicReplacement = UInt32(0xd0d0d0d0)
      >var segments: [(String, [(isB: Bool, origCommand: Segment64LoadCommand, data: Data, offset: UInt64)])] = []
      >for seg in dataA.segments {
      >    guard !segments.contains(where: { $0.0 == seg.0.name }) else {
      >        print("Found duplicate segment! [A]")
      >        exit(-1)
      >    }
      >    var data = seg.1
      >    if seg.0.name == "__TEXT" {
      >        data = Data(fromObject:magicReplacement) + data.subdata(in: 4..<data.count)
      >    }
      >    segments.append((seg.0.name, [(isB: false, origCommand: seg.0, data: data, offset: 0)]))
      >}      
      >```

      新的dyld中会包含两处0xd0d0d0d0，并且后面字节可以解析出Mach-O header。作者代码中说明这么做是为了避免Frida出错。

   * dyld修补指令检测

      从内存中的 dyld Mach-O 镜像定位 `dyld4::ProcessConfig::Security::getAMFI`，读取函数入口的 8 字节，并与 `e0 1f 80 d2 c0 03 5f d6` 比对。匹配时可作为 Dopamine 修补 dyld 的特征。

   * dyld完整性检测

      对dyld进行完整性检测，比如对比相同系统版本的CDHash是否一致，如不一致说明dyld被修改。

2. systemhook检测

    Dopamine会向每一个进程注入systemhook.dyld，有以下几种检测方式：

    * 文件路径检测
      
      systemhook.dylib存放在/usr/lib/目录下，可以用stat函数判断/usr/lib/systemhook.dylib文件是否存在。

    * DYLD_INSERT_LIBRARIES环境变量检测

      launchd在启动进程时会设置环境变量DYLD_INSERT_LIBRARIES，其中写入systemhook.dyld的文件路径，随后dyld在加载动态链接库时读取该环境变量并加载systemhook.dyld，但是在systemhook.dyld加载后，会特意将改环境变量移除掉：

      > [main.c#L374-L379](https://github.com/opa334/Dopamine/blob/5b1d2c1c3bf54dd8e3641d29c60cd3a0c13cde88/BaseBin/systemhook/src/main.c#L372-L379)
      >```c
      >const char *dyldInsertLibraries = getenv("DYLD_INSERT_LIBRARIES");
      >if (dyldInsertLibraries) {
      >  if (!strcmp(dyldInsertLibraries, HOOK_DYLIB_PATH)) {
      >    unsetenv("DYLD_INSERT_LIBRARIES");
      >  }
      >}
      >```
      
      在应用内直接读取环境变量实际上是检测不到的，但是dyld会将其读到的环境变量变量写入到CrashReporter中的message2字段：

      > [DyldProcessConfig.cpp#L1537-L1548](https://github.com/apple-oss-distributions/dyld/blob/18d3cb0f6b46707fee6d315cccccf7af8a8dbe57/dyld/DyldProcessConfig.cpp#L1537-L1548)
      >```c
      >if ( security.allowEnvVarsPath ) {
      >    char crashMsg[2048];
      >    strlcpy(crashMsg, "dyld config: ", sizeof(crashMsg));
      >    for (const char* const* p = process.envp; *p != nullptr; ++p) {
      >        this->addEnvVar(process, security, allocator, *p, false, crashMsg);
      >    }
      >    if ( strlen(crashMsg) > 15 ) {
      >        // if there is a crash, have DYLD_ env vars show up in crash log as secondary string
      >        // main string is missing symbol/dylib message
      >        CRSetCrashLogMessage2(allocator.strdup(crashMsg));
      >    }
      >}
      >```

      CrashReporter位于dyld的Mach-O镜像中的__DATA,__crash_info，可以从内存中解析读取。
      
      ![crash_report]({{ '/assets/images/crash_report.webp' | relative_url }}){: .jailbreak-screenshot}


    * 动态链接库枚举
    
      枚举当前进程加载的动态链接库，判断是否存在systemhook.dyld，有多种动态链接库枚举方法：
      1. `task_info(TASK_DYLD_INFO)` 从内核中直接获取
      
      2. 调用dyld提供的函数获取
        
          dyld函数有两种方式获取加载的dylib：
          * 使用 `_dyld_image_count` 和 `_dyld_get_image_name` 遍历所有加载的dylib，
          * `_dyld_register_func_for_add_image` 函数添加回调函数获取所有dylib。

      3. `mach_vm_region` 扫描进程内存，寻找Mach-O Header，再从Mach-O中解析出加载的dylib。

      ![image_list]({{ '/assets/images/image_list.webp' | relative_url }}){: .jailbreak-screenshot}

    * 系统函数Hook检测

      systemhook内部使用[litehook](https://github.com/opa334/litehook/blob/4f062946a964575694878130acecb7c990baba38/src/litehook.c#L166)对多个系统函数(__posix_spawn、__execve、csops等)进行Inline Hook，将源函数入口前5条指令修改为跳转到目标地址：

      >[litehook.c#L166-L180](https://github.com/opa334/litehook/blob/4f062946a964575694878130acecb7c990baba38/src/litehook.c#L166-L180)

      >```c
      >kern_return_t litehook_hook_function(void *source, void *target)
      >{
      >	void *sourceUnsigned = ptrauth_strip(source, ptrauth_key_function_pointer);
      >	void *targetUnsigned = ptrauth_strip(target, ptrauth_key_function_pointer);
      >	uint32_t hookBytes[] = {
      >		_lth_arm64_gen_movk(16, (uint64_t)targetUnsigned >>  0,  0),
      >		_lth_arm64_gen_movk(16, (uint64_t)targetUnsigned >> 16, 16),
      >		_lth_arm64_gen_movk(16, (uint64_t)targetUnsigned >> 32, 32),
      >		_lth_arm64_gen_movk(16, (uint64_t)targetUnsigned >> 48, 48),
      >		_lth_arm64_gen_br(16),
      >	};
      >	return litehook_hook_memory(sourceUnsigned, hookBytes, sizeof(hookBytes));
      >}
      >```

      可根据该特征对部分系统函数进行Hook检测。
    
      ![litehook]({{ '/assets/images/litehook.webp' | relative_url }}){: .jailbreak-screenshot}
    
    * 符号探测

      探测systemhook.dyld的导出符号是否存在，如果存在说明存在systemhook.dyld。

      ```shell
      dyld_info -exports systemhook.dylib
      systemhook.dylib [arm64]:
          -exports:
              offset      symbol
              0x00010018  _JB_BootUUID
              0x00010020  _JB_RootPath
              0x00004624  ___execve_hook
              0x000062F8  ___execve_inline
              0x0000452C  ___posix_spawn_hook
              ...
      ```

3. 越狱环境检测
     
     * /usr/lib目录挂载状态检查
     
        原始的/usr/lib目录挂载在系统/目录，文件类型是只读apfs，Dopamine为了能够替换dyld和添加systemhook.dylib，将越狱环境目录中.faklib目录挂载为/usr/lib，文件类型为只读bindfs。
     
     * 越狱环境目录/var/jb是否存在

     * 越狱软件探测

        探测越狱软件是否存在，比如有些应用会注册独特的url schema：

        ```
        sileo://  越狱软件商店
        zbra://   越狱软件商店
        filza://  文件管理器(存在filza不一定是越狱，一些版本的iOS存在沙盒逃逸漏洞，安装filza可以查看沙盒限制外的文件)
        ```

        或者设备上安装了ssh server，可以探测22、2222端口；安装了frida server，可以探测27042端口。

      ![jailbreak]({{ '/assets/images/jailbreak.webp' | relative_url }}){: .jailbreak-screenshot}


## 0x3 palera1n

[palera1n](https://palera.in/)是基于checkm8 bootrom漏洞的越狱工具，主要支持A8–A11设备，覆盖iOS、iPadOS、tvOS 和 bridgeOS。

| iPhone(s) | iPad(s) | iPod(s) | Apple TV(s) |
| --- | --- | --- | --- |
| iPhone 6s | iPad mini 4 | iPod Touch (7th generation) | Apple TV HD |
| iPhone 6s Plus | iPad (5th generation) | | Apple TV 4K (1st generation) |
| iPhone SE (2016) | iPad (6th generation) | | |
| iPhone 7 | iPad (7th generation) | | |
| iPhone 7 Plus | iPad Pro (9.7") | | |
| iPhone 8 | iPad Pro (12.9") (1st generation) | | |
| iPhone 8 Plus | iPad Pro (10.5") | | |
| iPhone X | iPad Pro (12.9") (2nd generation) | | |
| | iPad Air 2 | | |


palera1n越狱需要将设备连接电脑，通过越狱程序引导设备进入DFU模式，然后进行checkm8漏洞利用。设备每次重启后需要重新连接电脑越狱。

<details markdown="1">
<summary>运行palera1n </summary>

```bash
> palera1n -l
#
# palera1n: v2.2.1
#
# ========  Made by  =======
# Made by: Nick Chan, Ploosh, Khcrysalis, Mineek, staturnz, kok3shidoll, HAHALOSAH
# ======== Thanks to =======
# Thanks to: llsc12, Nebula, Lrdsnow, nikias (libimobiledevice),
# checkra1n team (Siguza, axi0mx, littlelailo et al.),
# Procursus Team (Hayden Seay, Cameron Katri, Keto et.al)
# ==========================

 - [11/14/26 01:23:55] <Info>: Waiting for devices
 - [11/14/26 01:23:55] <Info>: Entering recovery mode
 - [11/14/26 01:24:06] <Info>: Press Enter when ready for DFU mode

Hold volume down + side button (0)
Hold volume down button (4)
 - [11/14/26 01:24:25] <Info>: Device entered DFU mode successfully
 - [11/14/26 01:24:26] <Info>: About to execute checkra1n
#
# Checkra1n 0.1337.3
#
# Proudly written in nano
# (c) 2019-2023 Kim Jong Cracks
#
#========  Made by  =======
# argp, axi0mx, danyl931, jaywalker, kirb, littlelailo, nitoTV
# never_released, nullpixel, pimskeks, qwertyoruiop, sbingner, siguza
#======== Thanks to =======
# haifisch, jndok, jonseals, xerub, lilstevie, psychotea, sferrini
# Cellebrite (ih8sn0w, cjori, ronyrus et al.)
#==========================

 - [11/14/26 01:24:27] <Verbose>: Starting thread for Apple TV 4K Advanced board
 - [11/14/26 01:24:27] <Info>: Waiting for DFU mode devices
 - [11/14/26 01:24:27] <Verbose>: DFU mode device found
 - [11/14/26 01:24:27] <Info>: Checking if device is ready
 - [11/14/26 01:24:27] <Verbose>: Attempting to perform checkm8 on 8015 11
 - [11/14/26 01:24:27] <Info>: Setting up the exploit
 - [11/14/26 01:24:27] <Verbose>: == checkm8 setup stage ==
 - [11/14/26 01:24:27] <Verbose>: Entered initial checkm8 state after 1 steps
 - [11/14/26 01:24:27] <Verbose>: Stalled input endpoint after 1 steps
 - [11/14/26 01:24:28] <Verbose>: DFU mode device disconnected
 - [11/14/26 01:24:28] <Verbose>: DFU mode device found
 - [11/14/26 01:24:28] <Verbose>: == checkm8 trigger stage ==
 - [11/14/26 01:24:30] <Info>: Checkmate!
 - [11/14/26 01:24:30] <Verbose>: Device should now reconnect in download mode
 - [11/14/26 01:24:30] <Verbose>: DFU mode device disconnected
 - [11/14/26 01:24:50] <Error>: Timed out waiting for download mode (error code: -status_exploit_timeout_error)
 - [11/14/26 01:24:55] <Info>: Entered download mode
 - [11/14/26 01:24:55] <Verbose>: Download mode device found
 - [11/14/26 01:24:55] <Info>: Booting PongoOS...
 - [11/14/26 01:24:57] <Info>: Found PongoOS USB Device
 - [11/14/26 01:24:57] <Info>: Booting Kernel...
```

</details>

### 0x3_1 实现原理

checkm8漏洞利用DFU模式下的Use-After-Free（UAF），在安全机制加载前实现任意代码执行，属于硬件级漏洞，无法通过系统更新来修复。

具体工作流程：

1. 利用checkm8漏洞启动PongoOS
  
    引导设备进入DFU模式，然后利用checkm8漏洞，将设备启动PongoOS，PongoOS是一个轻量的系统环境，类似Android的fastboot模式，提供命令接口和文件上传能力。

2. 内核修补与启动
  
    通过PongoOS上传KPF（Kernel Patch Finder）和Ramdisk，KPF用于对XNU内核进行必要修补（例如绕过代码签名、AMFI 等限制），Ramdisk包括越狱所需的二进制文件、工具，系统启动后会挂载到/cores目录。

3. 进程注入与运行时

   * fakedyld：伪装dyld，处理启动参数、挂载文件系统。
   
   * payload_dylib：注入到launchd，提供持久化钩子（包括进程注入、环境变量设置等）。
   
   * systemhook.dylib：注入到大多数进程，负责加载插件。
   
   * jailbreakd：处理用户空间重启等请求。

4. 越狱环境安装

    安装Procursus越狱环境并链接到/var/jb，安装包管理器(Sileo或Zebra)。

### 0x3_2 检测方法
1. fakedyld检测

    palera1n也会修改dyld，但是和Dopamine不一样，palera1n不直接修改原始/usr/lib/dyld文件，而是拷贝一份到/cores/usr/lib/dyld进行修改，然后修补内核，让其在查找动态链接器时，优先使用/cores/usr/lib/dyld，而不是使用Mach-O中LC_LOAD_DYLINKER指定的路径。

    >[shellcode.S#L415-L459](https://github.com/palera1n/PongoOS/blob/e98323f8a09abd80fc4cbcd74dee023b91a1ec22/checkra1n/kpf/shellcode.S#L415-L459)
    >```asm
    >...
    >L_dyld_shc_no_hook:
    >    adr x0, L_dyld_path
    >L_dyld_shc_epilog:
    >    ldp x29, x30, [sp], 0x20
    >    ret
    >L_alt_dyld_path:
    >    .asciz "/cores/usr/lib/dyld"
    >L_dyld_path:
    >    .asciz "/usr/lib/dyld"
    >.align 2
    >_dyld_shc_end:
    >```

    * dyld路径检测

      1. 检测/cores/usr/lib/dyld路径是否存在

          正常系统不会存在/cores/usr/lib/dyld文件，甚至不会存在/cores这个目录
      
      2. 进程内读取dyld路径

          调用 `task_info(TASK_DYLD_INFO)` 从内核中获取当前进程实际使用的dyld路径

    * dyld修补指令检测

        fakedyld会修改dyld中的 `amfi_check_dyld_policy_self` 函数入口指令为固定16字节序列 D2 80 1B E8 F9 00 00 28 D2 80 00 00 D6 5F 03 C0：

        >[patcher.c#L191-L211](https://github.com/palera1n/jbinit/blob/df653b8a4cc30cdc3bcec65d4aff0ed7b598da22/src/fakedyld/patch_dyld/patcher.c#L191-L211)

        >```c
        >void dyld_proces_config_patch(void* buf) {
        >    struct nlist_64 *amfi_flags = macho_find_symbol(buf, amfi_check_dyld_policy_self_symbol);
        >    if (!amfi_flags) {
        >        dev_panic("%s not found", amfi_check_dyld_policy_self_symbol);
        >        return;
        >    }
        >    
        >    uint32_t *func_addr = buf + amfi_flags->offset;
        >    uint64_t func_len = macho_get_symbol_size(amfi_flags);
        >    if (func_len < 16) {
        >        dev_panic("%s too small", amfi_check_dyld_policy_self_symbol);
        >        return;
        >    }
        >    
        >    // Replace the entire func
        >    func_addr[0] = 0xd2801be8; // mov x8, 0xdf
        >    func_addr[1] = 0xf9000028; // str x8, [x1]
        >    func_addr[2] = 0xd2800000; // mov x0, #0
        >    func_addr[3] = 0xd65f03c0; // ret
        >    LOG("Patched dyld AMFI process config");
        >}
        >```

2. systemhook检测

    和Dopamine检测类似，有两点不同：
    
    * palera1n的systemhook.dylib位于/cores/binpack/usr/lib/systemhook.dylib。
  
    * 系统函数Hook方案不同，Dopamine是修改函数入口指令跳转到目标函数，palera1n利用dyld符号替换机制(DYLD_INTERPOSE):

      >[dyld-interpose.h](https://github.com/palera1n/jbinit/blob/main/include/dyld-interpose.h)
      >```c
      >#define DYLD_INTERPOSE(_replacment,_replacee) \
      >__attribute__((used)) static struct{ const void* replacment; const void* replacee; } >_interpose_##_replacee \
      >__attribute__ ((section ("__DATA,__interpose"))) = { (const void*)(unsigned long)&_replacment, (const >void*)(unsigned long)&_replacee };
      >```
      >
      >[main.c#L706-L719](https://github.com/palera1n/jbinit/blob/df653b8a4cc30cdc3bcec65d4aff0ed7b598da22/src/systemhook/main.c#L706-L719)
      >```c
      >DYLD_INTERPOSE(posix_spawn_hook, posix_spawn)
      >DYLD_INTERPOSE(posix_spawnp_hook, posix_spawnp)
      >DYLD_INTERPOSE(execve_hook, execve)
      >DYLD_INTERPOSE(execle_hook, execle)
      >DYLD_INTERPOSE(execlp_hook, execlp)
      >DYLD_INTERPOSE(execv_hook, execv)
      >DYLD_INTERPOSE(execl_hook, execl)
      >DYLD_INTERPOSE(execvp_hook, execvp)
      >DYLD_INTERPOSE(execvP_hook, execvP)
      >DYLD_INTERPOSE(sandbox_init_hook, sandbox_init)
      >DYLD_INTERPOSE(sandbox_init_with_parameters_hook, sandbox_init_with_parameters)
      >DYLD_INTERPOSE(sandbox_init_with_extensions_hook, my_sandbox_init_with_extensions)
      >DYLD_INTERPOSE(reboot3_hook, reboot3)
      >```

      这种hook方式不会修改原始函数的指令，只是修改了当前进程中的符号地址，检测时可以通过dlsym获取符号地址，然后用dladdr查询出地址位是否位于systemhook.dylib。

      ![palera1n_hook]({{ '/assets/images/palera1n_hook.webp' | relative_url }}){: .jailbreak-screenshot}


3. 越狱环境检测

      * /core目录挂载状态检查

      * 越狱环境目录/var/jb是否存在

      * 越狱软件探测

        和Dopamine检测类似，额外一点是，palera1n会自动安装dropbear(ssh server)监听在44端口。

        ![palera1n]({{ '/assets/images/palera1n.webp' | relative_url }}){: .jailbreak-screenshot}

## 0x4 越狱检测方法汇总

| 检测对象 | 检测方法 | Dopamine | palera1n |
| --- | --- | --- | --- |
| dyld | 检查文件路径和符号链接 | `/usr/lib/dyld` 是符号链接，指向 Procursus 环境中修改后的 dyld。 | 检查 `/cores/usr/lib/dyld` 是否存在，并可通过 `task_info(TASK_DYLD_INFO)` 获取当前进程实际使用的 dyld 路径。 |
| dyld | 检查 Mach-O UUID | `LC_UUID` 的前缀为 `DOPA`，后接 Dopamine 版本号。 | — |
| dyld | 检查 Mach-O section | `__DATA` 段中存在 `__jbinfo` section。 | — |
| dyld | 检查启动入口 | `LC_UNIXTHREAD` 中的 PC 指向 `_MACHOMERGER_START_HOOK`。 | — |
| dyld | 检查合并后的 Mach-O header | 两处 `0xd0d0d0d0` 后的字节均可按 Mach-O header 解析。 | — |
| dyld | 检查完整性 | 将 dyld 的 CDHash 与同系统版本的原版 dyld 对比。 | — |
| dyld | 检查修补指令 | 检查 `dyld4::ProcessConfig::Security::getAMFI` 入口的 8 字节是否为 `e0 1f 80 d2 c0 03 5f d6`。 | 检查 `amfi_check_dyld_policy_self` 入口的四个 32 位指令字是否依次为 `0xd2801be8`、`0xf9000028`、`0xd2800000`、`0xd65f03c0`。 |
| systemhook | 检查文件路径 | 用 `stat` 检查 `/usr/lib/systemhook.dylib`。 | 用 `stat` 检查 `/cores/binpack/usr/lib/systemhook.dylib`。 |
| systemhook | 检查注入环境变量的记录 | 从 dyld 的 `__DATA,__crash_info` 读取 CrashReporter 的 `message2`，检查 `DYLD_INSERT_LIBRARIES` 是否记录了 `systemhook.dylib`。 | 同左，检查 palera1n 的注入路径。 |
| systemhook | 枚举进程内已加载的镜像 | 用 `task_info(TASK_DYLD_INFO)`、`_dyld_image_count` 配合 `_dyld_get_image_name`，或 `_dyld_register_func_for_add_image` 查找 `systemhook.dylib`。也可用 `mach_vm_region` 扫描内存并解析 Mach-O。 | 同左。 |
| systemhook | 检查系统函数 Hook | 检查 `__posix_spawn`、`__execve`、`csops` 等函数入口是否符合 litehook 的 Inline Hook 跳转指令特征。 | 检查 `DYLD_INTERPOSE` 符号替换。用 `dlsym` 获取 `posix_spawn`、`execve` 等符号的地址，再用 `dladdr` 判断地址是否位于 `systemhook.dylib`。 |
| systemhook | 探测导出符号 | 查找 `_JB_BootUUID`、`_JB_RootPath` 等 `systemhook.dylib` 的导出符号。 | 同类检查，查找 `systemhook.dylib` 的导出符号。 |
| 越狱环境 | 检查挂载状态 | 检查 `/usr/lib` 是否从越狱环境的 `.faklib` 以只读 `bindfs` 挂载。 | 检查越狱启动环境的 `/cores` 挂载。 |
| 越狱环境 | 检查环境目录 | 检查 `/var/jb` 是否存在。 | 同左。 |
| 越狱环境 | 探测应用 URL Scheme | 检查 Sileo 的 `sileo://`、Zebra 的 `zbra://`、Filza 的 `filza://`。其中 `filza://` 也可能出现在未越狱设备上。 | 同左。 |
| 越狱环境 | 探测服务端口 | 检查 SSH 的 `22`、`2222` 端口和 Frida Server 的 `27042` 端口。 | 同左，另外检查 Dropbear 的 `44` 端口。 |

## 0x5 参考资料

[https://ellekit.space/dopamine/](https://ellekit.space/dopamine/)

[https://palera.in/](https://palera.in/)

[https://github.com/roothide/Dopamine-roothide](https://github.com/roothide/Dopamine-roothide)

[https://github.com/ProcursusTeam/Procursus](https://github.com/ProcursusTeam/Procursus)
