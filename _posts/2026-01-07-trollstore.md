---
title: "TrollStore(巨魔)"
---

<!--more-->
## 0x1 TrollStore是什么
[TrollStore](https://github.com/opa334/TrollStore)(巨魔)是iOS应用签名和安装工具。

iOS系统的[代码签名机制]({% post_url 2025-12-15-ios-code-signature %})，限定了只能安装有苹果签名的应用，应用安装渠道通常为App Store，或者由苹果签发的开发者证书或企业证书签名的应用，并且个人免费账号安装应用只有7天有效期，需要定期刷新授权。

使用TrollStore能绕过iOS系统的代码签名验证，无需越狱和Apple开发者账号就能永久安装任意App。

支持系统版本14.0 beta 2 - 16.6.1, 16.7 RC (20H18)、17.0。

## 0x2 TrollStore工作原理

TrollStore基于CoreTrust代码签名漏洞CVE-2023-41991，CoreTrust是AMFI中负责实际进行签名和证书校验的内核模块。当代码签名中存在多个签名记录时：
* 返回最后一个签名记录的验证结果
* 返回第一个签名记录中的CodeDirectory的哈希值

TrollStore在安装应用时，构造特殊的代码签名：
1. 借用合法App Store应用的SHA-1 CodeDirectory作为主CODE_DIRECTORY

2. 构造真正匹配目标程序的SHA-256 CodeDirectory作为ALTERNATE_CODE_DIRECTORIES

3. 生成签名数据SIGNATURE_SLOT，其中包含两个签名信息SignerInfo
  * 签名信息1: 使用TrollStore自签名证书对两个CODE_DIRECTORY进行签名
  * 签名信息2: App Store应用的签名信息，和主CODE_DIRECTORY数据对应

CoreTrust会逐个验证这两个签名信息，签名信息1使用自签名证书不被iOS信任会验证失败，签名信息2完全来自正常应用的签名数据，最终会返回验证成功。

CoreTrust还会将签名信息1中记录的CodeDirectory的哈希值返回作为CDHash，签名信息1包括两个CodeDirectory哈希值，一个是不属于当前应用的SHA-1，一个是匹配当前应用的SHA-256，CoreTrust按摘要算法的强度选择这里的SHA-256作为结果返回。

下面以TrollStore安装的Dopamine应用为例说明。首先是两个CODE_DIRECTORY：
* CODE_DIRECTORY: 来自应用com.icraze.gtatracker，哈希算法SHA-1(hashType=1)。
* ALTERNATE_CODE_DIRECTORIES: 当前应用真实CodeDirectory，哈希算法SHA-256(hashType=2)。

![CodeDirectory]({{ '/assets/images/trollstore_code_directory.jpg' | relative_url }})

然后是两个[签名信息](https://lapo.it/asn1js/#MIIYVwYJKoZIhvcNAQcCoIIYSDCCGEQCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BBwGgghDMMIIDmTCCAoGgAwIBAgIBATANBgkqhkiG9w0BAQsFADBDMQswCQYDVQQGEwJVUzE0MDIGA1UEAwwrVHJvbGxTdG9yZSAyIGlQaG9uZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTAeFw0yMzEyMjYyMzA0NDFaFw0yMzEyMjYyMzA0NDFaMEMxCzAJBgNVBAYTAlVTMTQwMgYDVQQDDCtUcm9sbFN0b3JlIDIgaVBob25lIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9rl_6IjtPDmEy41UZS8eXJVu3JRm1ql49zu-5-psFB5V_ZYSj5AaHLB3AZjx71vIR7UrS_OHd5Esa6glMGgX6PkvvGlyqDnSK9qIj8wmwSIFRC6vt-Y-OmPZFhsos9KBCLrKBODS_DI1l3_EszIaaPFdymHINvB0G2I9nOwg_IJJaoax9q0c1X4QHjaq5U7BpAPmSYPWYvmCe102gXHVP9mY92CWm4kNhngss5LgeIJ7XAJPXnV1BKs6izjvTplEWwHhZ817VrLZAmScFz6NfbOgClvlCKtqhI4A2NM3gFWFcVVDuFask2_DEHcgx-UGOtaHJts6QviTm97ZcxUg4QIDAQABo4GXMIGUMA8GA1UdEwEB_wQFMAMBAf8wDgYDVR0PAQH_BAQDAgKEMBMGA1UdJQQMMAoGCCsGAQUFBwMDMBIGCSqGSIb3Y2QGFgEB_wQCBQAwEwYKKoZIhvdjZAYBAwEB_wQCBQAwFAYLKoZIhvdjZAYBGQEBAf8EAgUAMB0GA1UdDgQWBBTBFubNWdLmjZtQx1F3pIFlgRS24TANBgkqhkiG9w0BAQsFAAOCAQEAKxMmP2AhNJZU5TIrJqunkxMHuYqWl8gVg2OdmH93RIxfc2GMKjJXNCa7CnKClhUMyCkpooaovAUfYfeloa9vzjrmPk5SMgUMCsUTKZos9PXvzWNVwrakvq9ztmt0oF94dSdntzV73T4EMM_Vs31AK7cJNpFZ4h4WZTCIm4kx3Ue2GTh2aNGJRPTjxTs6vsPx8h-XkEfDpw0ZL59JTKnxGjSr8MAYdzzV1OYK4Eg7gRWwmykIVOjWE-vqfDhKNdPoHRKElmzAFyM4xiUg_kTjlmzUoFVPsXFNk5kBOMjQa5aIy562W7ZCuuJO3xAYKaamsce_XxDjnlubGpgDSnLgGDCCBCQwggMMoAMCAQICCEBgV7PJv53wMA0GCSqGSIb3DQEBCwUAMHMxLTArBgNVBAMMJEFwcGxlIGlQaG9uZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTEgMB4GA1UECwwXQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxEzARBgNVBAoMCkFwcGxlIEluYy4xCzAJBgNVBAYTAlVTMB4XDTE5MDcxNjAzNTMyMloXDTIxMDgxNDAzNTMyMlowYTELMAkGA1UEBhMCVVMxEzARBgNVBAoMCkFwcGxlIEluYy4xDzANBgNVBAsMBmlQaG9uZTEsMCoGA1UEAwwjQXBwbGUgaVBob25lIE9TIEFwcGxpY2F0aW9uIFNpZ25pbmcwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDLTQUoZVOM0-xYeE0GVK6gW1QHtfEUw4VflJu1h2Jshsln_wYuNJpWHg-WUj7HXiaiaNytflHfpFFDG9Nzo8mKNVU5FDZdr5hPU2K0cZH-P721sj9ZD-Ha74K5Y5T0tgFQdd2567ic4Ge13aHMaJBKbUsH5KmD3pqi9UBbMDpAvREtFxjX4eug5_BpDyiIjvEd_Ee5l-UUrsFPqpow23QO-fXAolrF83cyLrwhplOo7ySZFQpmZIH6GRcOVdH1z791kc19qqKgoGe7LMb_WRUPZRn8rQSjNISQSR1gQq8Kx7BHkm8UtvEdXmDi6LH6KK8s6TsGd4Qx-i2bm07kcax3AgMBAAGjgc0wgcowDAYDVR0TAQH_BAIwADAfBgNVHSMEGDAWgBRv8ZUYYlzgyPHF7WwYyeDTZFKYIDBABggrBgEFBQcBAQQ0MDIwMAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmFwcGxlLmNvbS9vY3NwMDMtYWlwY2EwNDAWBgNVHSUBAf8EDDAKBggrBgEFBQcDAzAdBgNVHQ4EFgQUlLjJYDe5-48KXtiojWV8ozY5AjAwDgYDVR0PAQH_BAQDAgeAMBAGCiqGSIb3Y2QGAQMEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQB482JTS1f7T2F_b1nVN3RNe9PKIVy_rhmG0qMip_PpOdkxSWkm3v-Yi-qRkHN2TnUtY5iAP9e-PJmDuQFDkgOmOgVOVxjQjt0bDt59xCQLQm1v5EfYxHhht8NC0udAeS80MEmar7GeqfpmOHgwaJTcp1X8v36dhwzEYzGKDmu-xQemkcIEYlONrm3LNlbOyK85pct-kA-VzMFDOs3JBrGZ0P3wqEKooM96G-3eZxxuzWM41ZAM7jOw3Q6CisW1uXrkBztRhL2LWDen8ku05hYkZYy5ujTT_vApIoWndFwya4hFyd4hjtNTnDrZQDNZP2_-NcYrcdA83TaPjmbqASUYMIIERDCCAyygAwIBAgIIXGPK5Eo3U8kwDQYJKoZIhvcNAQELBQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsTHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBSb290IENBMB4XDTE3MDUxMDIxMjczMFoXDTMwMTIzMTAwMDAwMFowczEtMCsGA1UEAwwkQXBwbGUgaVBob25lIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MSAwHgYDVQQLDBdDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJRWoBDz6DBIbH_L_cXvAege4XMHNjJi7ePXokzZM-TzlHunW-88DS8Vmiqx_-CoY82S2aB_IOa7kpkRpfIgqL8XJYBa5MS0TFeaeAPLCI4IwMJ4RdGeWHGTbL48V2t7D0QXJR9AVcg0uibaZRuPEm33terWUMxrKYUYy7fRtMwU7ICMfS7WQLtN0bjU9AfRuPSJaSW_PQmH7ZvKQZDplhu0FdAcxbd3p9JNDc01P_w9zFlCy2Wk2OGCM5vdnGUj7R8vQliqEqh_3YDEYpUf_tF2yJJWuHv4ppFJ93n8MVt2iziEW9hOYGAkFkD60qKLgVyeCsp4q6cgQ0sniM-LKFAgMBAAGjgewwgekwDwYDVR0TAQH_BAUwAwEB_zAfBgNVHSMEGDAWgBQr0GlHlHYJ_vRrjS5ApvdHTX8IXjBEBggrBgEFBQcBAQQ4MDYwNAYIKwYBBQUHMAGGKGh0dHA6Ly9vY3NwLmFwcGxlLmNvbS9vY3NwMDMtYXBwbGVyb290Y2EwLgYDVR0fBCcwJTAjoCGgH4YdaHR0cDovL2NybC5hcHBsZS5jb20vcm9vdC5jcmwwHQYDVR0OBBYEFG_xlRhiXODI8cXtbBjJ4NNkUpggMA4GA1UdDwEB_wQEAwIBBjAQBgoqhkiG92NkBgISBAIFADANBgkqhkiG9w0BAQsFAAOCAQEAOs-smI2-kiAhCa2V87FcIfo2LVcgRHRzZJIIs5as922X-ls0OCfPEkbTPBHwB8mZkLHR6BEJpeOla2xjCD-eJfrVmZxM5uXOjrJNaOyLq6OiT4oRFT7cFCscxkS2b2fFW0-VKS2HXD_cgx53T-3aVKct5xOBwWPEVAsbSwpqKCII1DeSfH9nKF-vPT-3rFkdODRkWu4zShlCRCnEyhhr4cFTLS30TcIV9jMyGHjxJm-KTeuUTKPo_w-zA4tl2usu2GVQn9yfit8xqIRU3FJSQdKyEx0xRkeIXz7uw_KMIwSV66yKPoJsBp8u44tDmmJbNA30mc8s7rpyhhkjpfyOtTCCBLswggOjoAMCAQICAQIwDQYJKoZIhvcNAQEFBQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsTHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBSb290IENBMB4XDTA2MDQyNTIxNDAzNloXDTM1MDIwOTIxNDAzNlowYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsTHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBSb290IENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5JGpCR-R2x5HUOsF7V55hC3rNqJXTFXsixmJ3vlLbPUHqyIwAugYPvhQCdN_QaiY-dHKZpwkaxHQo7vkGyrDH5WeegykR4tb1BY3M8vED03OFGnRyRly9V0O1X9fm_IlA7pVj01dDfFkNSMVSxVZHbOU9_acns9QusFYUGePCLQg98usLCBvcLY_ATCMt0PPD5098ytJKBrI_s61uQ7ZXhzWyz21Oq30Dw4AkguxIRYudNU8DdtiFqujcZJHU1XBry9Bs_j743DN5qNMRX4fTGtQlkGJxHRiCxCDQYczioGxMFjsWgQyjGizjx3eZXP_Z15lvEnYdp8zFGWhd5TJLQIDAQABo4IBejCCAXYwDgYDVR0PAQH_BAQDAgEGMA8GA1UdEwEB_wQFMAMBAf8wHQYDVR0OBBYEFCvQaUeUdgn-9GuNLkCm90dNfwheMB8GA1UdIwQYMBaAFCvQaUeUdgn-9GuNLkCm90dNfwheMIIBEQYDVR0gBIIBCDCCAQQwggEABgkqhkiG92NkBQEwgfIwKgYIKwYBBQUHAgEWHmh0dHBzOi8vd3d3LmFwcGxlLmNvbS9hcHBsZWNhLzCBwwYIKwYBBQUHAgIwgbYagbNSZWxpYW5jZSBvbiB0aGlzIGNlcnRpZmljYXRlIGJ5IGFueSBwYXJ0eSBhc3N1bWVzIGFjY2VwdGFuY2Ugb2YgdGhlIHRoZW4gYXBwbGljYWJsZSBzdGFuZGFyZCB0ZXJtcyBhbmQgY29uZGl0aW9ucyBvZiB1c2UsIGNlcnRpZmljYXRlIHBvbGljeSBhbmQgY2VydGlmaWNhdGlvbiBwcmFjdGljZSBzdGF0ZW1lbnRzLjANBgkqhkiG9w0BAQUFAAOCAQEAXDaZTC14t-2Mm9zzd5vydtJ3ME_BH4WDhRuZPUc38qmbQI4s1LGQEti-9HOb7tJkD8t5TzTYoj75eP9ryAfsfTmDi1Mg0zjEsb-aTwpr_yv8WacFCXwXQFYRHnTTt4sjO0ej1W8k4uvRt3DfD0XhJ8rxbXjt57UXF6jcfiI1yiXV2Q_Wa9SiJCMR96Gsj3OBYMYbWwkvkrL4REjwYDieFfU9JmcgijNq9w2Cz97roy_5U2pbZMBjM3f3OgcsVuvaDyEO2rpzGU-12TZ_wYdV2aeZuTJC-9jVcZ5-oVK3G72TQiQSKscPHbZNnF5jyEuAF1CqitXa5PzQCQc3sHV1ITGCB08wggOWAgEBMEgwQzELMAkGA1UEBhMCVVMxNDAyBgNVBAMMK1Ryb2xsU3RvcmUgMiBpUGhvbmUgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkCAQEwCwYJYIZIAWUDBAIBoIICJTAYBgkqhkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJBTEPFw0yNjEwMjkwNjU1MjBaMC8GCSqGSIb3DQEJBDEiBCDClo9KY8DPts2CuEjiBD2gcf6jZjKMtOCUEtu1c5bExDBbBgkqhkiG92NkCQIxTjAdBgUrDgMCGgQUUfm8opW-nC4d7nfQk84Pzz_JNFAwLQYJYIZIAWUDBAIBBCDxWzNOgGtoFQxqIhg0fG1YRPaF02AqmTaU7y7xMgq7lDCCAVsGCSqGSIb3Y2QJATGCAUwEggFIPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIHBsaXN0IFBVQkxJQyAiLS8vQXBwbGUvL0RURCBQTElTVCAxLjAvL0VOIiAiaHR0cDovL3d3dy5hcHBsZS5jb20vRFREcy9Qcm9wZXJ0eUxpc3QtMS4wLmR0ZCI-CjxwbGlzdCB2ZXJzaW9uPSIxLjAiPgo8ZGljdD4KCTxrZXk-Y2RoYXNoZXM8L2tleT4KCTxhcnJheT4KCQk8ZGF0YT4KCQlVZm04b3BXK25DNGQ3bmZRazg0UHp6L0pORkE9CgkJPC9kYXRhPgoJCTxkYXRhPgoJCThWc3pUb0JyYUJVTWFpSVlOSHh0V0VUMmhkTT0KCQk8L2RhdGE-Cgk8L2FycmF5Pgo8L2RpY3Q-CjwvcGxpc3Q-CjANBgkqhkiG9w0BAQEFAASCAQDc8zTHM9JLaWcC1xfSyzG9Rr-YHex4yBkWJSzvEmSeYIbz7OysJXc47txr837gATGwfP03tKlmMRlLpJAZK8nq6SXiRwV_LNLSBNAJ4Yf6FTvBff37OWenk__D5UAG6WgHlZYcU-PzQtIcCQs4YGttxZjAaE-nONjHd2GZ9XRo1icvc8BFHajteCcbalhn1naC_RLlw8tvBAReOVb2uMIELrlSOMq47Bp3kvq5G4Pb5827kmUH7XLgoo29nWqemeGtLW-hp_uy_ZSXlSWtyLi4Sf0NTc8xFIXhJCvz_TMy3rbX7wW6C3lRXBz6LGdOp_3OVDP9-Ib1_RoO1gyNnB8yMIIDsQIBATB_MHMxLTArBgNVBAMMJEFwcGxlIGlQaG9uZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTEgMB4GA1UECwwXQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxEzARBgNVBAoMCkFwcGxlIEluYy4xCzAJBgNVBAYTAlVTAghAYFezyb-d8DANBglghkgBZQMEAgEFAKCCAgcwGAYJKoZIhvcNAQkDMQsGCSqGSIb3DQEHATAvBgkqhkiG9w0BCQQxIgQgwpaPSmPAz7bNgrhI4gQ9oHH-o2YyjLTglBLbtXOWxMQwWwYJKoZIhvdjZAkCMU4wHQYFKw4DAhoEFFH5vKKVvpwuHe530JPOD88_yTRQMC0GCWCGSAFlAwQCAQQgk3IZw5gY130Me5NsutYspExEt6SqfFBAk28ws-EZsEAwggFbBgkqhkiG92NkCQExggFMBIIBSDw_eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04Ij8-CjwhRE9DVFlQRSBwbGlzdCBQVUJMSUMgIi0vL0FwcGxlLy9EVEQgUExJU1QgMS4wLy9FTiIgImh0dHA6Ly93d3cuYXBwbGUuY29tL0RURHMvUHJvcGVydHlMaXN0LTEuMC5kdGQiPgo8cGxpc3QgdmVyc2lvbj0iMS4wIj4KPGRpY3Q-Cgk8a2V5PmNkaGFzaGVzPC9rZXk-Cgk8YXJyYXk-CgkJPGRhdGE-CgkJVWZtOG9wVytuQzRkN25mUWs4NFB6ei9KTkZBPQoJCTwvZGF0YT4KCQk8ZGF0YT4KCQlrM0ladzVnWTEzME1lNU5zdXRZc3BFeEV0NlE9CgkJPC9kYXRhPgoJPC9hcnJheT4KPC9kaWN0Pgo8L3BsaXN0PgowDQYJKoZIhvcNAQELBQAEggEAOz1gjaKVHlumArRxw_oB8BwfFY3wFct2av20lRRv6kwb8TKA55cEAAdNhnO-XNQT5DG3lMBq-UpIekTeZ8iyze0s_4DslsEuNxNnG6NUY4iEXRrKyVjsyoI4jSkcylhQxNCRuiJ-cwBYSF1JvefeNSP6YJMSmC_2izhUMnUKO-1_anj3hzBJ9B8NCou3p35pSDRsm3fODmjZMLLGozCKh9kl11jBrjNP6yzL8rLoLalMqNhki5HctlVphENLdea61lhbXueRWmmbtkV_Gp8Lh6xMyFhZGCUCbLJm8SzHr2h6DoKTJ9h1Ad_Up7qlbrIWSZrv3-ynFXgFaDev9vupOw):

签名信息1: 使用自签名证书 TrollStore 2 iPhone Certification Authority
![singerInfo1]({{ '/assets/images/singerInfo1.jpg' | relative_url }})

签名信息2: 来自正式App Store中的应用签名
![singerInfo2]({{ '/assets/images/singerInfo2.jpg' | relative_url }})

## 0x3 TrollStore安装应用检测
根据上面的介绍，TrollStore安装的应用有以下几个特征：
1. 第一个CODE_DIRECTORY来自其他应用，ident和teamId字段值不等于当前应用，在TrollStore的代码中固定为com.icraze.gtatracker和T8ALTGMVXN。

2. 验证第一个CODE_DIRECTORY的哈希数组是否是当前应用的真实哈希值。

3. 代码签名中存在非Apple的自签名证书的签名

4. 代码签名中记录的CodeDirectory的哈希值与真实的CodeDirectory的哈希不一致。

可根据以上特征识别出当前应用是否是通过TrollStore或基于CoreTrust代码签名安装。

## 0x4 如何安装TrollStore
TrollStore利用的是CoreTrust签名验证漏洞，但首次安装TrollStore本身通常还需要额外的漏洞利用链。

| 安装方式 | 适用 iOS 版本 | 是否需要电脑 | 利用的漏洞或机制 | 
|---|---|---|---|
| TrollHelperOTA | iOS 14、15 部分版本及 iOS 16.0  | 否 | OTA 安装机制及相关漏洞 |
| TrollInstallerX | iOS 14.0–16.6.1，部分 iOS 17.0 Beta | 要 | kfd、dmaFail PPL Bypass 等 |
| TrollInstallerMDC | iOS 15.5–15.7.1 部分设备 | 要 | MacDirtyCow（CVE-2022-46689） |
| TrollRestore | iOS 15.2–17.0 的部分版本 | 是 | 备份恢复机制 |

## 0x5 TrollFools代码注入
TrollStore可以绕过代码签名验证，意味着可以对目标应用进行修改，改变程序运行逻辑，然后重新签名运行。

[TrollFools](https://github.com/Lessica/TrollFools)是基于TrollStore的代码注入工具，其工作原理为直接修改目标程序的Mach-O文件，将动态库(dylib)插入进去，然后使用和TrollStore相同方式给目标应用进行重新签名。

下面用一个例子来说明。使用fishhook实现对sysctlbyname函数的hook，修改机型参数sysctlbyname("hw.machine")为"iPhone99,99"，将以下代码编译得到`ModelHook.dylib`。
```c
#include <errno.h>
#include <stddef.h>
#include <string.h>
#include <sys/sysctl.h>

#include "fishhook.h"

static int (*original_sysctlbyname)(const char *, void *, size_t *, void *, size_t);
static const char spoofed_model[] = "iPhone99,99";

static int hooked_sysctlbyname(const char *name, void *oldp, size_t *oldlenp,
                              void *newp, size_t newlen) {
    // Forward unrelated queries and any attempted writes unchanged.
    if (name == NULL || strcmp(name, "hw.machine") != 0 || newp != NULL || newlen != 0) {
        if (original_sysctlbyname == NULL) {
            errno = ENOSYS;
            return -1;
        }
        return original_sysctlbyname(name, oldp, oldlenp, newp, newlen);
    }

    if (oldlenp == NULL) {
        errno = EFAULT;
        return -1;
    }
    if (oldp == NULL) {
        *oldlenp = sizeof(spoofed_model); // Includes the terminating NUL.
        return 0;
    }

    size_t capacity = *oldlenp;
    size_t copied = capacity < sizeof(spoofed_model) ? capacity : sizeof(spoofed_model);
    memcpy(oldp, spoofed_model, copied);
    *oldlenp = copied;
    if (capacity < sizeof(spoofed_model)) {
        errno = ENOMEM;
        return -1;
    }
    return 0;
}

#ifndef MODEL_HOOK_UNIT_TEST
__attribute__((constructor))
static void install_model_hook(void) {
    struct rebinding binding = {
        "sysctlbyname", (void *)hooked_sysctlbyname, (void **)&original_sysctlbyname
    };
    rebind_symbols(&binding, 1);
}
#endif
```

在TrollFools中选择给查看设备信息应用DevInfo注入`ModelHook.dylib`，随后打开App生效，设备机型被修改成"iPhone99,99"：

![trollfools]({{ '/assets/images/trollfools.png' | relative_url }})

查看注入后的程序，发现添加了`LC_LOAD_WEAK_DYLIB` load command，加载`ModelHook.dylib`。
```shell
> otool -l DeviceInfo.app/Frameworks/GDTMobSDK.framework/GDTMobSDK|grep -B 3 -A 3 ModelHook
Load command 52
          cmd LC_LOAD_WEAK_DYLIB
      cmdsize 48
         name @rpath/ModelHook.dylib (offset 24)
   time stamp 0 Thu Jan  1 07:30:00 1970
      current version 0.0.0
compatibility version 0.0.0
```


## 0x6 参考
https://github.com/opa334/TrollStore

https://github.com/JJTech0130/TrollRestore

https://github.com/Lessica/TrollFools

https://web.archive.org/web/20251115111515/https://goa2025.nullcon.net/doc/goa-2025/State-of-iOS-Jailbreaking-in-2025.pdf