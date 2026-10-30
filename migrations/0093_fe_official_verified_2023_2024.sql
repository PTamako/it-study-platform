-- Original 2023/2024 IPA FE A/B public CBT items, matched to official answer PDFs.
-- Transcribe only text-based questions whose inputs and choices are complete.
-- Keep each original question ID distinct from existing adapted practices.
-- Do not modify old questions, study attempts, question mastery or review history.

INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES
('fe-ipa-official-2024-a-02','exam-fe','ハッシュ','standard','single_choice','【2024年度 IPA公開問題 科目A 問2】キーが小文字のアルファベット 1 文字（a，b，…，z のいずれか）であるデータを，大きさが 10 のハッシュ表に格納する。ハッシュ関数として，アルファベットの ASCII コードを 10 進表記法で表したときの 1 の位の数を用いることにする。衝突が起こるキーの組合せはどれか。ASCII コードでは，昇順に連続した 2 進数が，アルファベット順にコードとして割り当てられている。','[{"id":"a","text":"a と i"},{"id":"b","text":"b と r"},{"id":"c","text":"c と l"},{"id":"d","text":"d と x"}]','"d"','d と x の ASCII コードの差は 20 であり，10 で割った余りは同じ。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2024-a-04','exam-fe','稼働率','standard','single_choice','【2024年度 IPA公開問題 科目A 問4】あるシステムの今年度の MTBF は 3,000 時間，MTTR は 1,000 時間である。翌年度は MTBF について今年度の 20％分の改善，MTTR について今年度の 10％分の改善を図ると，翌年度の稼働率は何％になるか。','[{"id":"a","text":"69"},{"id":"b","text":"73"},{"id":"c","text":"77"},{"id":"d","text":"80"}]','"d"','MTBF 3,600，MTTR 900，稼働率は 3,600／4,500＝80％。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2024-a-06','exam-fe','画像処理','standard','single_choice','【2024年度 IPA公開問題 科目A 問6】液晶ディスプレイなどの表示装置において，傾いた直線の境界を滑らかに表示する手法はどれか。','[{"id":"a","text":"アンチエイリアシング"},{"id":"b","text":"シェーディング"},{"id":"c","text":"テクスチャマッピング"},{"id":"d","text":"バンプマッピング"}]','"a"','アンチエイリアシングは斜線のジャギーを目立ちにくくする。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2024-a-07','exam-fe','データベース','standard','single_choice','【2024年度 IPA公開問題 科目A 問7】DBMS に実装すべき原子性（atomicity）を説明したものはどれか。','[{"id":"a","text":"同一データベースに対する同一処理は，何度実行しても結果は同じである。"},{"id":"b","text":"トランザクション完了後にハードウェア障害が発生しても，更新されたデータベースの内容は保証される。"},{"id":"c","text":"トランザクション内の処理は，全てが実行されるか，全てが取り消されるかのいずれかである。"},{"id":"d","text":"一つのトランザクションの処理結果は，他のトランザクション処理の影響を受けない。"}]','"c"','原子性はすべて実行か，すべてロールバックのいずれかを保証する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES
('fe-ipa-official-2024-a-08','exam-fe','ネットワーク','standard','single_choice','【2024年度 IPA公開問題 科目A 問8】LAN 間接続装置に関する記述のうち，適切なものはどれか。','[{"id":"a","text":"ゲートウェイは，OSI 基本参照モデルにおける第 1 ～ 3 層だけのプロトコルを変換する。"},{"id":"b","text":"ブリッジは，IP アドレスを基にしてフレームを中継する。"},{"id":"c","text":"リピータは，同種のセグメント間で信号を増幅することによって伝送距離を延長する。"},{"id":"d","text":"ルータは，MAC アドレスを基にしてフレームを中継する。"}]','"c"','リピータは物理層の信号を中継し伝送距離を延長する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2024-a-10','exam-fe','情報セキュリティ','standard','single_choice','【2024年度 IPA公開問題 科目A 問10】SQL インジェクションの対策として，有効なものはどれか。','[{"id":"a","text":"URL を Web ページに出力するときは，“http://”や“https://”で始まる URL だけを許可する。"},{"id":"b","text":"外部からのパラメータで Web サーバ内のファイル名を直接指定しない。"},{"id":"c","text":"スタイルシートを任意の Web サイトから取り込めるようにしない。"},{"id":"d","text":"プレースホルダを使って命令文を組み立てる。"}]','"d"','SQL に値を文字列結合せずプレースホルダでバインドする。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2024-a-11','exam-fe','ソフトウェアテスト','standard','single_choice','【2024年度 IPA公開問題 科目A 問11】階層構造のモジュール群から成るソフトウェアの結合テストを，上位のモジュールから行う。この場合に使用する，下位のモジュールの代替となるテスト用のモジュールはどれか。','[{"id":"a","text":"エミュレータ"},{"id":"b","text":"シミュレータ"},{"id":"c","text":"スタブ"},{"id":"d","text":"ドライバ"}]','"c"','トップダウン型の結合テストで未完成の下位モジュールを代替するのがスタブ。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2024-a-12','exam-fe','アジャイル開発','standard','single_choice','【2024年度 IPA公開問題 科目A 問12】アジャイル開発手法の一つであるスクラムで定義され，スプリントで実施するイベントのうち，毎日決まった時間に決まった場所で行い，開発チームの全員が前回からの進捗状況や今後の作業計画を共有するものはどれか。','[{"id":"a","text":"スプリントプランニング"},{"id":"b","text":"スプリントレトロスペクティブ"},{"id":"c","text":"スプリントレビュー"},{"id":"d","text":"デイリースクラム"}]','"d"','デイリースクラムは短時間の進捗共有と計画調整のイベント。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_a_qs.pdf','ja','A','explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES
('fe-ipa-official-2023-a-01','exam-fe','数値表現','standard','single_choice','【2023年度 IPA公開問題 科目A 問1】16 進小数 0.C を 10 進小数に変換したものはどれか。','[{"id":"a","text":"0.12"},{"id":"b","text":"0.55"},{"id":"c","text":"0.75"},{"id":"d","text":"0.84"}]','"c"','16 進数 C は十進で 12。小数 0.C は 12／16＝0.75。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2023-a-03','exam-fe','コンピュータ構成','standard','single_choice','【2023年度 IPA公開問題 科目A 問3】コンピュータの高速化技術の一つであるメモリインタリーブに関する記述として，適切なものはどれか。','[{"id":"a","text":"主記憶と入出力装置，又は主記憶同士のデータの受渡しを CPU 経由でなく直接やり取りする方式"},{"id":"b","text":"主記憶にデータを送り出す際に，データをキャッシュに書き込み，キャッシュがあふれたときに主記憶へ書き込む方式"},{"id":"c","text":"主記憶のデータの一部をキャッシュにコピーすることによって，レジスタと主記憶とのアクセス速度の差を縮める方式"},{"id":"d","text":"主記憶を複数の独立して動作するグループに分けて，各グループに並列にアクセスする方式"}]','"d"','複数の独立したメモリバンクへ並列にアクセスして実効帯域を高める。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2023-a-04','exam-fe','エッジコンピューティング','standard','single_choice','【2023年度 IPA公開問題 科目A 問4】エッジコンピューティングの説明として，最も適切なものはどれか。','[{"id":"a","text":"画面生成やデータ処理をクライアント側で実行することによって，Web アプリケーションソフトウェアの操作性や表現力を高めること"},{"id":"b","text":"データが送信されてきたときだけ必要なサーバを立ち上げて，処理が終わり次第サーバを停止してリソースを解放すること"},{"id":"c","text":"複数のサーバや PC を仮想化して統合することによって一つの高性能なコンピュータを作り上げ，並列処理によって処理能力を高めること"},{"id":"d","text":"利用者や機器に取り付けられたセンサなどのデータ発生源に近い場所にあるサーバなどでデータを一次処理し，処理のリアルタイム性を高めること"}]','"d"','データ発生源に近いエッジ側で処理し低遅延化を図る。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2023-a-05','exam-fe','画像処理','standard','single_choice','【2023年度 IPA公開問題 科目A 問5】3 次元グラフィックス処理におけるクリッピングの説明はどれか。','[{"id":"a","text":"CG 映像作成における最終段階として，物体のデータをディスプレイに描画できるように映像化する処理である。"},{"id":"b","text":"画像表示領域にウィンドウを定義し，ウィンドウの外側を除去し，内側の見える部分だけを取り出す処理である。"},{"id":"c","text":"スクリーンの画素数が有限であるために図形の境界近くに生じる，階段状のギザギザを目立たなくする処理である。"},{"id":"d","text":"立体感を生じさせるために，物体の表面に陰影を付ける処理である。"}]','"b"','ウィンドウの外側を切り落とし，表示範囲だけを残す。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES
('fe-ipa-official-2023-a-07','exam-fe','データベース','standard','single_choice','【2023年度 IPA公開問題 科目A 問7】トランザクションが，データベースに対する更新処理を完全に行うか，全く処理しなかったかのように取り消すか，のどちらかの結果になることを保証する特性はどれか。','[{"id":"a","text":"一貫性（consistency）"},{"id":"b","text":"原子性（atomicity）"},{"id":"c","text":"耐久性（durability）"},{"id":"d","text":"独立性（isolation）"}]','"b"','原子性はトランザクションの操作が全て確定するか全て取り消される性質。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2023-a-08','exam-fe','ネットワーク','standard','single_choice','【2023年度 IPA公開問題 科目A 問8】IPv4 ネットワークにおいて，ネットワークの疎通確認に使われるものはどれか。','[{"id":"a","text":"BOOTP"},{"id":"b","text":"DHCP"},{"id":"c","text":"MIB"},{"id":"d","text":"ping"}]','"d"','ping は ICMP を使ってネットワークの到達可能性を確認する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2023-a-12','exam-fe','アジャイル開発','standard','single_choice','【2023年度 IPA公開問題 科目A 問12】アジャイル開発手法のスクラムにおいて，開発チームの全員が 1 人ずつ“昨日やったこと”，“今日やること”，“障害になっていること”などを話し，全員でプロジェクトの状況を共有するイベントはどれか。','[{"id":"a","text":"スプリントプランニング"},{"id":"b","text":"スプリントレビュー"},{"id":"c","text":"デイリースクラム"},{"id":"d","text":"レトロスペクティブ"}]','"c"','デイリースクラムでは毎日短時間で進捗や障害を共有する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit'),
('fe-ipa-official-2023-a-19','exam-fe','組織・情報戦略','standard','single_choice','【2023年度 IPA公開問題 科目A 問19】CIO の説明はどれか。','[{"id":"a","text":"経営戦略の立案及び業務執行を統括する最高責任者"},{"id":"b","text":"資金調達，財務報告などの財務面での戦略策定及び執行を統括する最高責任者"},{"id":"c","text":"自社の技術戦略や研究開発計画の立案及び執行を統括する最高責任者"},{"id":"d","text":"情報管理，情報システムに関する戦略立案及び執行を統括する最高責任者"}]','"d"','CIO は最高情報責任者であり，情報戦略・情報システムの管理を統括する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_a_qs.pdf','ja','A','explicit');
INSERT OR IGNORE INTO questions (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language, exam_section, exam_section_method) VALUES
('fe-ipa-official-2024-b-01','exam-fe','FE算法与程序设计','standard','single_choice','【2024年度 IPA公開問題 科目B 問1】次のプログラム中の空欄に入れる正しい答えを，解答群の中から選べ。

関数 maximum は，異なる三つの整数を引数で受け取り，そのうちの最大値を返す。
〔プログラム〕
○整数型: maximum(整数型: x, 整数型: y, 整数型: z)
  if (［　］)
    return x
  elseif (y ＞ z)
    return y
  else
    return z
  endif','[{"id":"a","text":"x ＞ y"},{"id":"b","text":"x ＞ y and x ＞ z"},{"id":"c","text":"x ＞ y and y ＞ z"},{"id":"d","text":"x ＞ z"},{"id":"e","text":"x ＞ z and z ＞ y"},{"id":"f","text":"z ＞ y"}]','"b"','x が最大になる条件は x＞y かつ x＞z。下位分岐は y と z を比較する。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/eid2eo0000007g1d-att/2024r06_fe_kamoku_b_qs.pdf','ja','B','explicit'),
('fe-ipa-official-2023-b-01','exam-fe','FE算法与程序设计','standard','single_choice','【2023年度 IPA公開問題 科目B 問1】次のプログラム中の a と b に入れる正しい答えの組合せを，解答群の中から選べ。ここで，配列の要素番号は 1 から始まる。

関数 findPrimeNumbers は，引数で与えられた整数以下の，全ての素数だけを格納した配列を返す関数である。ここで，引数に与える整数は 2 以上である。
〔プログラム〕
○整数型の配列: findPrimeNumbers(整数型: maxNum)
  整数型の配列: pnList ← {}
  整数型: i, j
  論理型: divideFlag
  for (i を 2 から ［a］まで 1 ずつ増やす)
    divideFlag ← true
    for (j を 2 から i の正の平方根の整数部分まで 1 ずつ増やす)
      if (［b］)
        divideFlag ← false
        繰返し処理を終了する
      endif
    endfor
    if (divideFlag が true と等しい)
      pnList の末尾に i の値を追加する
    endif
  endfor
  return pnList','[{"id":"a","text":"a: maxNum、b: i ÷ j の余り が 0 と等しい"},{"id":"b","text":"a: maxNum、b: i ÷ j の商 が 1 と等しくない"},{"id":"c","text":"a: maxNum ＋ 1、b: i ÷ j の余り が 0 と等しい"},{"id":"d","text":"a: maxNum ＋ 1、b: i ÷ j の商 が 1 と等しくない"}]','"a"','2 から maxNum まで走査し，割り切れる整数があれば素数ではない。','official','https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/t6hhco0000003zx0-att/2023r05_fe_kamoku_b_qs.pdf','ja','B','explicit');
