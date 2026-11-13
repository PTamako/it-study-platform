import json
from pathlib import Path
rows=[
 (31,'OSIネットワーク層','OSI基本参照モデルのネットワーク層の説明として適切なものはどれか。',['エンドシステム間の伝送のためルーティングや中継を行う','利用者に最も近くファイル転送や電子メールを実現する','物理媒体の特性差を吸収して上位へ透明な伝送路を提供する','隣接ノード間の誤り検出や再送制御を提供する'],'a','ネットワーク層は経路選択やパケット中継を担当する。中文：网络层负责路由选择及数据包中继。'),
 (32,'リピータ','LANの伝送距離を延長するため、信号波形を増幅・整形して物理層で中継する装置はどれか。',['スイッチングハブ（レイヤ2スイッチ）','ブリッジ','リピータ','ルータ'],'c','リピータは物理層で信号を再生・中継する。中文：中继器在物理层再生并转发信号以延长传输距离。'),
 (34,'MIME','電子メールで静止画、動画、音声など様々な情報を送る仕組みはどれか。',['FTP','MIME','POP','TELNET'],'b','MIMEは電子メールで多様な形式のデータを扱う拡張。中文：MIME扩展邮件格式，使其可包含图片、音频等多种内容。'),
 (36,'DNSキャッシュポイズニング','DMZ上のDNSサーバを社外公開用と社内の名前解決用に共用している。このサーバがDNSキャッシュポイズニングを受けた場合、直接起こり得る現象はどれか。',['DNSサーバのディスク上のサーバ名が書き換わり接続不能になる','DNSサーバのメモリにワームが常駐して不正プログラムを送り込む','社内メールの宛先アドレスが書き換わり送信不能になる','社内利用者が特定のWebサーバへアクセスすると別のWebサーバへ誘導される'],'d','偽の名前解決結果がキャッシュされ、正規名でも偽サイトへ誘導され得る。中文：DNS缓存被污染后，用户访问正常域名时可能被引导到错误服务器。'),
 (37,'ソーシャルエンジニアリング','ソーシャルエンジニアリングに分類される手口はどれか。',['ウイルスが作成したバックドアから侵入する','管理者などを装い利用者に問い合わせてパスワードを得る','総当たり攻撃ツールでパスワードを解析する','バッファオーバフローの脆弱性を利用して侵入する'],'b','人をだまして秘密情報を得る手口。中文：冒充管理员向用户套取密码属于社会工程学攻击。'),
 (38,'パスワード再設定','Webシステムのパスワードを忘れ、登録済みの合い言葉が一致した後の処理として適切なものはどれか。',['登録済みメールアドレスへ現在のパスワードを送る','登録済みメールアドレスへ推測困難な再登録用URLを送る','新たに入力させたメールアドレスへ現在のパスワードを送る','新たに入力させたメールアドレスへ推測困難な再登録用URLを送る'],'b','登録済みの連絡先へ安全な再設定URLを送り、現在のパスワードは送らない。中文：应向预先登记的邮箱发送难以猜测的重置链接，不发送当前密码。'),
 (40,'ハイブリッド暗号','OpenPGPやS/MIMEで用いるハイブリッド暗号方式の特徴はどれか。',['IPsecとTLSを選択可能にして利用者の利便性を高める','公開鍵暗号と共通鍵暗号を組み合わせ、鍵管理と処理性能を両立する','異なる複数の共通鍵暗号を組み合わせて処理性能を高める','異なる複数の公開鍵暗号を組み合わせて安全性を高める'],'b','本文は高速な共通鍵暗号、共通鍵の安全な配送には公開鍵暗号を利用する。中文：混合加密结合对称加密的速度与公钥加密的密钥分发能力。'),
 (42,'クライアント証明書','利用者PCからDMZの公開Webサイトに接続し、内部のDBへ個人情報を保存するシステムで、利用者個人のディジタル証明書を用いたTLS通信の効果はどれか。',['PCとDB間を暗号化しDBサーバの正当性を確認する','PCとDB間を暗号化し利用者を認証する','PCとWebサーバ間を暗号化しDBサーバの正当性を確認する','PCとWebサーバ間を暗号化し利用者を認証する'],'d','TLSが保護するのはPCとWebサーバ間で、利用者の証明書によって利用者認証が可能。中文：TLS保护客户端与Web服务器之间的通信，客户端证书可用于认证用户。'),
 (43,'サンドボックス','情報セキュリティにおけるサンドボックスの説明はどれか。',['多様なソフトウェアや機器が出力する大量のログを分析する','入力中のHTML、JavaScript、SQLを別の文字列に置き換える','Webサーバの前段で不特定多数のPCからの要求に代理応答する','不正動作する可能性のあるプログラムを特別な領域で動かし他への影響を防ぐ'],'d','隔離環境で動作させ、他の領域への影響を制限する。中文：沙箱在隔离环境中运行可能不安全的程序，限制其影响范围。'),
 (44,'パケットフィルタリング','パケットフィルタリング型ファイアウォールが通信パケットの通過可否を判断するときに用いるものはどれか。',['Webアプリケーションに渡されるPOSTデータ','送信元と宛先のIPアドレスおよびポート番号','送信元のMACアドレス','利用者のPCから送信されたURL'],'b','パケットのIPアドレスやポートなどのヘッダ情報で通過可否を判断する。中文：包过滤防火墙依据源、目的IP地址和端口等头部信息判断是否放行。'),
 (45,'オブジェクト指向の委譲','オブジェクト指向における委譲の説明として適切なものはどれか。',['あるオブジェクトへの操作が関連するオブジェクトにも自動適用される','あるオブジェクトへの操作を内部で別のオブジェクトに依頼する','下位クラスが上位クラスの属性や操作を引き継ぐ','複数オブジェクトを部分として新たな一つのオブジェクトを生成する'],'b','自分への要求の処理を別オブジェクトに委ねる仕組み。中文：委托是对象把收到的操作交由另一个对象处理。'),
]
paper='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20200614_FE.pdf'
answer='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20200614_FE.pdf'
def sql(x):return "'"+str(x).replace("'","''")+"'"
questions=[];occ=[]
for n,topic,prompt,options,key,explanation in rows:
 ident=f'fe-exempt-2020-20200614-q{n:02}'
 opts=json.dumps([dict(id='abcd'[i],text=x) for i,x in enumerate(options)],ensure_ascii=False,separators=(',',':'))
 vals=[ident,'exam-fe',topic,'standard','single_choice',f'【IPA 2020年度 修了認定試験 2020-06-14 問{n}・改編】'+prompt,opts,json.dumps(key),explanation,'licensed',paper,'ja','A','explicit','standard','fe_exemption']
 questions.append('('+','.join(map(sql,vals))+')');occ.append('('+','.join(map(sql,['2020-06-14',n,'2020',ident,key,paper,answer]))+')')
for n,ident,key in [(33,'fe-exempt-2022-20221211-q33','c'),(35,'fe-ipa-2019-spring-am-adapt-36','a'),(39,'fe-ipa-sample-2022-a-032','a'),(41,'fe-ipa-2019-spring-am-adapt-42','a'),(46,'fe-ipa-2019-spring-am-adapt-47','b')]:
 occ.append('('+','.join(map(sql,['2020-06-14',n,'2020',ident,key,paper,answer]))+')')
out='-- IPA 2020 June source-reviewed network/security and exact repeated occurrences.\n'
out+='INSERT OR IGNORE INTO questions (id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin) VALUES\n'+',\n'.join(questions)+';\n'
out+='INSERT OR IGNORE INTO fe_exemption_occurrences (sitting_date,original_question,fiscal_year,canonical_question_id,official_answer,question_url,answer_url) VALUES\n'+',\n'.join(occ)+';\n'
Path(__file__).resolve().parents[1].joinpath('migrations/0178_fe_exemption_20200614_security.sql').write_text(out,encoding='utf-8')
