-- 扩充本地 IT 词典，增加多语言别名，使缩写、同义词和中日英输入均可检索。
-- 命中词库的结果由 D1 直接返回，不依赖第三方翻译服务。
ALTER TABLE vocabulary ADD COLUMN aliases TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_vocabulary_term_nocase ON vocabulary(term COLLATE NOCASE);

UPDATE vocabulary SET aliases = 'authentication|identity verification|认证|身份验证|オーセンティケーション' WHERE id = 'vocab-it-authentication';
UPDATE vocabulary SET aliases = 'authorization|access permission|授权|权限判定|オーソライズ' WHERE id = 'vocab-it-authorization';
UPDATE vocabulary SET aliases = 'MFA|multi-factor authentication|two-factor authentication|多因素认证|双因素认证' WHERE id = 'vocab-it-mfa';
UPDATE vocabulary SET aliases = 'hash|hash value|hash digest|哈希值|散列值|ハッシュ' WHERE id = 'vocab-it-hash';
UPDATE vocabulary SET aliases = 'digital signature|电子签名|数字签名|デジタル署名' WHERE id = 'vocab-it-signature';
UPDATE vocabulary SET aliases = 'public key|公钥|公開鍵' WHERE id = 'vocab-it-public-key';
UPDATE vocabulary SET aliases = 'private key|私钥|秘密鍵' WHERE id = 'vocab-it-private-key';
UPDATE vocabulary SET aliases = 'transaction|事务|transaction processing' WHERE id = 'vocab-it-transaction';
UPDATE vocabulary SET aliases = 'primary key|主键|PK' WHERE id = 'vocab-it-primary-key';
UPDATE vocabulary SET aliases = 'foreign key|外键|FK' WHERE id = 'vocab-it-foreign-key';
UPDATE vocabulary SET aliases = 'SQLi|SQL injection|SQL注入|SQLインジェクション' WHERE id = 'it-term-sql-injection';
UPDATE vocabulary SET aliases = 'Transport Layer Security|传输层安全|トランスポート層セキュリティ' WHERE id = 'it-term-tls';
UPDATE vocabulary SET aliases = 'application programming interface|应用程序编程接口|接口' WHERE id = 'it-term-api';
UPDATE vocabulary SET aliases = 'JavaScript Object Notation|JSON格式|数据交换格式' WHERE id = 'it-term-json';
UPDATE vocabulary SET aliases = 'D1 database|Cloudflare database|D1数据库' WHERE id = 'it-term-d1';
UPDATE vocabulary SET aliases = 'digital certificate|server certificate|电子证书|服务器证书' WHERE id = 'vocab-it-certificate';
UPDATE vocabulary SET aliases = 'atomicity|事务原子性' WHERE id = 'vocab-it-atomicity';
UPDATE vocabulary SET aliases = 'XSS|cross-site scripting|跨站脚本攻击' WHERE id = 'vocab-it-xss';
UPDATE vocabulary SET aliases = 'BCP|business continuity plan|业务连续性计划' WHERE id = 'vocab-it-bcp';
UPDATE vocabulary SET aliases = 'regression test|regression testing|回归测试' WHERE id = 'sg-v007-regression-test';
UPDATE vocabulary SET aliases = 'version control|版本控制|バージョン管理' WHERE id = 'sg-v007-version-control';
UPDATE vocabulary SET aliases = 'cross-origin resource sharing|跨域资源共享|跨源资源共享' WHERE id = 'sg-v007-cors';
UPDATE vocabulary SET aliases = 'cookies|浏览器Cookie|クッキー' WHERE id = 'sg-v007-cookie';
UPDATE vocabulary SET aliases = 'session|会话|セッション' WHERE id = 'sg-v007-session';
UPDATE vocabulary SET aliases = 'normalization|数据库规范化|正規化' WHERE id = 'sg-v007-normalization';
UPDATE vocabulary SET aliases = 'IP address|IP地址|IPアドレス' WHERE id = 'sg-v007-ip';
UPDATE vocabulary SET aliases = 'firewall|防火墙|ファイアウォール' WHERE id = 'sg-v007-firewall';
UPDATE vocabulary SET aliases = 'VPN|virtual private network|虚拟专用网络' WHERE id = 'sg-v007-vpn';
UPDATE vocabulary SET aliases = 'SLA|service level agreement|服务级别协议' WHERE id = 'sg-v007-sla';
UPDATE vocabulary SET aliases = 'HTTPS|加密HTTP|HTTP over TLS' WHERE id = 'sg-v007-https';
UPDATE vocabulary SET aliases = 'DHCP|dynamic host configuration protocol|动态主机配置协议' WHERE id = 'sg-v007-dhcp';
UPDATE vocabulary SET aliases = 'input validation|输入验证|输入校验' WHERE id = 'sg-v007-input-validation';

INSERT OR IGNORE INTO vocabulary
(id, term, language, reading, meaning_zh, meaning_ja, meaning_en, example, source_module, mastery, aliases)
VALUES
('it-local-source-code','ソースコード','ja','そーすこーど','源代码：以编程语言编写、供编译器或运行环境处理的程序文本。','プログラムを記述した、人が読める形式のソースとなるコード。','Source code is the human-readable program text written in a programming language.','変更前にソースコードを確認し、レビューを依頼する。','软件开发',0,'source code|源码|ソース'),
('it-local-compiler','コンパイラ','ja','こんぱいら','编译器：将源代码转换为目标代码或其他可执行形式的程序。','ソースコードを別の形式のコードへ変換するプログラム。','A compiler translates source code into another representation, often machine code.','コンパイラのエラーを確認してからビルドをやり直す。','软件开发',0,'compiler|编译器'),
('it-local-interpreter','インタプリタ','ja','いんたぷりた','解释器：读取并执行程序指令的运行程序。','プログラムを読み取りながら実行するソフトウェア。','An interpreter executes program instructions without requiring a separate ahead-of-time compilation step.','インタプリタ型の言語でも実行時エラーは発生する。','软件开发',0,'interpreter|解释器'),
('it-local-library','ライブラリ','ja','らいぶらり','程序库：可由多个程序复用的函数、类或模块集合。','再利用できる関数やクラスなどをまとめたもの。','A library is reusable code that an application can call.','日付処理には既存のライブラリを利用する。','软件开发',0,'library|程序库|函数库'),
('it-local-framework','フレームワーク','ja','ふれーむわーく','框架：提供程序结构和常用能力的软件基础。','アプリケーションの基本構造や共通機能を提供する土台。','A framework provides structure and common capabilities for building software.','フレームワークの規約に沿って画面を実装する。','软件开发',0,'framework|开发框架'),
('it-local-module','モジュール','ja','もじゅーる','模块：按职责划分、可独立维护和复用的代码单元。','特定の役割を持つように分割されたプログラムの単位。','A module groups related code behind a defined boundary.','機能ごとにモジュールを分けると保守しやすい。','软件开发',0,'module|模块'),
('it-local-dependency','依存関係','ja','いぞんかんけい','依赖关系：一个软件组件需要另一个组件才能运行或构建的关系。','あるコンポーネントが別のコンポーネントに依存している関係。','A dependency is a component required by another component.','依存関係を更新する前に互換性を確認する。','软件开发',0,'dependency|依赖|依存'),
('it-local-debugging','デバッグ','ja','でばっぐ','调试：定位、分析并修正程序缺陷的过程。','プログラムの不具合の原因を特定し、修正すること。','Debugging is the process of locating and fixing defects in software.','ログとブレークポイントを使ってデバッグする。','软件开发',0,'debugging|调试|デバッグ'),
('it-local-exception-handling','例外処理','ja','れいがいしょり','异常处理：捕获并妥善处理程序执行期间发生的异常情况。','実行中に発生した例外を捕捉し、適切に処理する仕組み。','Exception handling deals with exceptional conditions during execution.','例外処理でエラー内容を記録し、適切に終了する。','软件开发',0,'exception handling|异常处理|例外'),
('it-local-unit-test','単体テスト','ja','たんたいてすと','单元测试：独立验证函数、类或最小组件是否符合预期。','関数やクラスなど小さな単位の動作を検証するテスト。','A unit test verifies a small unit of software in isolation.','入力値ごとの単体テストを追加する。','测试',0,'unit test|单元测试'),
('it-local-integration-test','結合テスト','ja','けつごうてすと','集成测试：验证多个模块组合后能否正确协作。','複数のモジュールを組み合わせたときの連携を検証するテスト。','An integration test checks whether components work correctly together.','APIとデータベースの連携を結合テストで確認する。','测试',0,'integration test|集成测试'),
('it-local-regression-test','回帰テスト','ja','かいきてすと','回归测试：确认代码变更没有破坏既有功能。','変更によって既存機能に不具合が生じていないか確認するテスト。','Regression testing checks that changes have not broken existing behavior.','修正後に回帰テストを実行する。','测试',0,'regression test|回归测试'),
('it-local-mock','モック','ja','もっく','模拟对象：测试中替代真实依赖、控制输入与响应的对象。','テスト時に実際の依存先の代わりとして振る舞うオブジェクト。','A mock simulates a dependency so tests can control its behavior.','外部APIをモックに置き換えてテストする。','测试',0,'mock object|模拟对象|モックオブジェクト'),
('it-local-code-review','コードレビュー','ja','こーどれびゅー','代码审查：由他人检查代码的正确性、安全性、可读性和可维护性。','コードの品質や安全性、保守性などを他者が確認すること。','A code review examines code for correctness, security, and maintainability.','プルリクエストでコードレビューを受ける。','软件开发',0,'code review|代码审查|コードレビュー'),
('it-local-repository','リポジトリ','ja','りぽじとり','仓库：用于保存项目文件、历史版本和协作记录的位置。','ソースコードや変更履歴などを管理する保管場所。','A repository stores project files and their history.','リポジトリに変更をコミットする。','Git与协作',0,'repository|repo|代码仓库|仓库'),
('it-local-version-control','バージョン管理','ja','ばーじょんかんり','版本控制：跟踪文件变化，支持比较、回退和协作开发。','ファイルの変更履歴を記録し、比較や復元を可能にする仕組み。','Version control records changes so they can be compared and recovered.','Gitでソースコードのバージョン管理を行う。','Git与协作',0,'version control|版本控制'),
('it-local-branch','ブランチ','ja','ぶらんち','分支：从版本历史中分出独立开发线，便于并行修改。','変更を並行して進めるための独立した履歴の流れ。','A branch is an independent line of development in version control.','修正用のブランチを作成する。','Git与协作',0,'branch|分支'),
('it-local-commit','コミット','ja','こみっと','提交：将一组变更记录到版本控制历史中。','変更内容を履歴として記録すること。','A commit records a set of changes in version control.','変更内容を確認してからコミットする。','Git与协作',0,'commit|提交|コミットする'),
('it-local-merge','マージ','ja','まーじ','合并：将一个分支的变更整合到另一个分支。','あるブランチの変更を別のブランチに取り込むこと。','A merge integrates changes from one branch into another.','競合を解決してからブランチをマージする。','Git与协作',0,'merge|合并'),
('it-local-rebase','リベース','ja','りべーす','变基：将一组提交重新应用到新的基础提交之上。','コミット列を新しいベースの上に再適用する操作。','Rebase reapplies commits on top of a new base commit.','共有済みの履歴を変更する前に影響を確認する。','Git与协作',0,'rebase|变基'),
('it-local-merge-conflict','コンフリクト','ja','こんふりくと','合并冲突：多个变更无法自动整合，需要人工判断如何组合。','複数の変更を自動では統合できず、手動で解決する必要がある状態。','A merge conflict occurs when changes cannot be combined automatically.','コンフリクトの箇所を確認して正しい内容に修正する。','Git与协作',0,'merge conflict|conflict|合并冲突'),
('it-local-pull-request','プルリクエスト','ja','ぷるりくえすと','拉取请求：请求将某分支的变更合并到目标分支，并进行审查。','ブランチの変更を別のブランチへ取り込むためのレビュー依頼。','A pull request proposes changes for review and merging.','テストが成功したことを確認してプルリクエストを出す。','Git与协作',0,'pull request|PR|拉取请求'),
('it-local-frontend','フロントエンド','ja','ふろんとえんど','前端：用户直接交互的界面及客户端逻辑部分。','利用者が操作する画面やブラウザ側の処理部分。','The frontend is the user-facing interface and client-side logic.','フロントエンドからAPIを呼び出す。','Web开发',0,'frontend|前端'),
('it-local-backend','バックエンド','ja','ばっくえんど','后端：服务器端业务逻辑、数据处理和接口实现部分。','サーバー側で動く業務ロジックやデータ処理の部分。','The backend handles server-side logic, data access, and APIs.','バックエンドでリクエストを検証する。','Web开发',0,'backend|后端'),
('it-local-dom','DOM','ja','でぃーおーえむ','文档对象模型：浏览器将 HTML 文档表示为可编程节点树的接口。','HTML文書をノードの木構造として扱うためのモデル。','The DOM represents a document as a tree of nodes that scripts can access.','JavaScriptでDOMの内容を更新する。','Web开发',0,'document object model|文档对象模型'),
('it-local-spa','SPA','ja','えすぴーえー','单页应用：通过客户端路由和动态更新内容，减少整页重新加载的应用形式。','ページ全体を再読み込みせず、画面内容を更新するWebアプリケーション。','A single-page application updates views in the browser without full page reloads.','SPAではルーターで画面を切り替える。','Web开发',0,'single page application|单页应用'),
('it-local-pwa','PWA','ja','ぴーだぶりゅーえー','渐进式 Web 应用：利用 Web 技术提供接近原生应用体验的应用。','Web技術でアプリに近い利用体験を提供する仕組み。','A progressive web app uses web technologies to provide app-like features.','PWAとしてホーム画面に追加できるようにする。','Web开发',0,'progressive web app|渐进式Web应用'),
('it-local-ssr','SSR','ja','えすえすあーる','服务端渲染：由服务器生成页面 HTML，再发送给浏览器。','サーバー側でHTMLを生成してブラウザへ返す方式。','Server-side rendering generates HTML on the server.','SSRは初期表示や検索エンジン対応で役立つ場合がある。','Web开发',0,'server side rendering|服务端渲染'),
('it-local-component','コンポーネント','ja','こんぽーねんと','组件：可独立复用、组合的界面或软件单元。','独立して再利用でき、組み合わせて画面などを構成する単位。','A component is a reusable unit that can be composed with others.','検索ボックスをコンポーネントとして切り出す。','Web开发',0,'component|组件'),
('it-local-props','プロパティ','ja','ぷろぱてぃ','属性/传入参数：组件从父级接收的配置或数据。','コンポーネントが親から受け取る設定値やデータ。','Props are inputs passed from a parent component to a child component.','子コンポーネントには必要な値だけをpropsで渡す。','Web开发',0,'props|component properties|组件属性'),
('it-local-state-management','状態管理','ja','じょうたいかんり','状态管理：维护并协调应用中随用户操作或请求变化的数据。','画面やアプリケーションの状態を一貫して管理すること。','State management keeps changing application data consistent.','検索条件と検索結果の状態を分けて管理する。','Web开发',0,'state management|状态管理'),
('it-local-event-listener','イベントリスナー','ja','いべんとりすなー','事件监听器：在特定事件发生时执行的处理程序。','クリックなどのイベント発生時に実行する処理。','An event listener runs when a specified event occurs.','ボタンのクリックにイベントリスナーを登録する。','Web开发',0,'event listener|事件监听器'),
('it-local-routing','ルーティング','ja','るーてぃんぐ','路由：根据 URL 或请求条件决定显示页面或调用处理程序。','URLや条件に応じて表示画面や処理先を切り替える仕組み。','Routing maps a URL or request to a view or handler.','ルーティング設定を追加して画面を切り替える。','Web开发',0,'routing|路由'),
('it-local-cors','CORS','ja','しーおーあーるえす','跨源资源共享：浏览器依据响应头控制网页能否读取其他源的资源。','異なるオリジン間のリソース共有をブラウザが制御する仕組み。','Cross-origin resource sharing controls browser access to cross-origin responses.','APIのCORS設定を必要なオリジンに限定する。','Web安全',0,'cross-origin resource sharing|跨域资源共享'),
('it-local-cookie','Cookie','ja','くっきー','Cookie：浏览器按规则保存并随请求发送的小型数据。','ブラウザに保存され、条件に応じてリクエストとともに送信される小さなデータ。','A cookie is small data stored by a browser and sent with matching requests.','セッションCookieには適切な属性を設定する。','Web安全',0,'cookies|浏览器Cookie|クッキー'),
('it-local-session','セッション','ja','せっしょん','会话：用于关联同一用户或客户端一段时间内多次请求的状态。','一定期間の一連の通信や利用状態を関連付ける仕組み。','A session groups related interactions over a period of time.','セッションIDを推測されにくく管理する。','Web安全',0,'session|会话'),
('it-local-jwt','JWT','ja','じぇいだぶりゅーてぃー','JSON Web Token：以规定格式传递声明的令牌，签名不等于加密。','JSON形式のクレームを伝えるトークン形式。署名だけでは内容は暗号化されない。','JSON Web Token carries claims; a signature does not encrypt its contents.','JWTに秘密情報を入れても署名だけでは秘匿できない。','Web安全',0,'JSON web token|令牌|トークン'),
('it-local-oauth','OAuth 2.0','ja','おーおーす','授权框架：允许客户端在受限权限下访问资源，通常不直接证明用户身份。','限定された権限でリソースへのアクセスを委任する認可フレームワーク。','OAuth 2.0 is an authorization framework for delegated access.','OAuth 2.0のスコープは必要最小限にする。','身份与访问管理',0,'OAuth|OAuth2|授权框架'),
('it-local-schema','スキーマ','ja','すきーま','数据库模式：定义数据库中表、字段、约束等结构的描述。','データベースのテーブルや列、制約などの構造定義。','A schema describes the structure of database objects.','スキーマ変更の影響範囲を確認する。','数据库',0,'schema|数据库结构'),
('it-local-table','テーブル','ja','てーぶる','表：关系数据库中由行和列组成的数据集合。','行と列で構成される、関係データベースのデータ構造。','A table stores records in rows and columns.','顧客テーブルに必要な列を定義する。','数据库',0,'table|数据库表|表'),
('it-local-column','列','ja','れつ','列/字段：描述表中某一类属性的数据垂直集合。','テーブル内の一つの属性を表す縦方向の項目。','A column represents one attribute in a database table.','列の型とNULL可否を確認する。','数据库',0,'column|field|字段|カラム'),
('it-local-row','行','ja','ぎょう','行/记录：表中一条数据记录。','テーブルに格納された一件分のレコード。','A row is one record in a table.','条件に合う行だけを更新する。','数据库',0,'row|record|记录|レコード'),
('it-local-view','ビュー','ja','びゅー','视图：由查询定义的虚拟表，用于呈现特定数据集合。','SELECT文などで定義された仮想的なテーブル。','A view presents data through a stored query definition.','権限に応じたデータだけをビューで公開する。','数据库',0,'view|数据库视图|ビュー表'),
('it-local-join','結合','ja','けつごう','连接：根据关联条件组合两个或多个数据表的行。','関連する列などを条件に、複数のテーブルを組み合わせる操作。','A join combines rows from tables using a matching condition.','顧客IDで注文テーブルと顧客テーブルを結合する。','数据库',0,'join|连接|表连接'),
('it-local-inner-join','内部結合','ja','ないぶけつごう','内连接：只返回连接条件在两边都匹配的记录。','両方のテーブルで結合条件に一致した行だけを返す結合。','An inner join returns rows that match on both sides.','内部結合では一致しない顧客は結果に含まれない。','数据库',0,'inner join|内连接'),
('it-local-left-join','左外部結合','ja','ひだりがいぶけつごう','左连接：返回左表全部记录，以及右表匹配的记录；不匹配时右侧为 NULL。','左側の全行と、条件に一致する右側の行を返す結合。','A left join keeps all left-side rows and matching right-side rows.','商品に注文がない場合も左外部結合なら商品を表示できる。','数据库',0,'left join|左连接|LEFT OUTER JOIN'),
('it-local-normalization','正規化','ja','せいきか','规范化：通过组织表结构减少冗余并降低更新异常。','データの重複や更新異常を抑えるようにテーブル構造を整理すること。','Normalization organizes tables to reduce redundancy and update anomalies.','更新異常を防ぐためにテーブルを正規化する。','数据库',0,'normalization|数据库规范化'),
('it-local-unique-constraint','一意制約','ja','いちいせいやく','唯一约束：要求指定列或列组合的值不重复。','指定した列や列の組み合わせで値の重複を禁止する制約。','A unique constraint prevents duplicate values in specified columns.','メールアドレスに一意制約を設定する。','数据库',0,'unique constraint|唯一约束'),
('it-local-not-null','NOT NULL制約','ja','のっとぬるせいやく','非空约束：禁止字段保存 NULL 值。','列にNULLを格納できないようにする制約。','A NOT NULL constraint prevents a column from containing NULL.','必須項目にはNOT NULL制約を設定する。','数据库',0,'NOT NULL|not null constraint|非空约束'),
('it-local-check-constraint','CHECK制約','ja','ちぇっくせいやく','检查约束：要求数据满足指定条件后才允许写入。','列の値が指定した条件を満たすことを要求する制約。','A check constraint restricts values to those satisfying a condition.','年齢列に0以上というCHECK制約を設定する。','数据库',0,'check constraint|检查约束'),
('it-local-execution-plan','クエリ実行計画','ja','くえりじっこうけいかく','查询执行计划：显示数据库准备如何访问表、使用索引并执行连接等操作。','データベースがSQLをどのような手順で実行するかを示す計画。','A query execution plan shows how a database intends to execute SQL.','実行計画を確認して遅い検索の原因を調べる。','数据库',0,'query execution plan|execution plan|执行计划'),
('it-local-table-scan','テーブルスキャン','ja','てーぶるすきゃん','全表扫描：逐行检查表中的记录以寻找符合条件的数据。','テーブルの行を順に調べて条件に合うデータを探す処理。','A table scan examines table rows to find matching data.','大きなテーブルの全表スキャンが遅延の原因になっていないか確認する。','数据库',0,'table scan|full table scan|全表扫描'),
('it-local-composite-index','複合インデックス','ja','ふくごういんでっくす','复合索引：由多个字段组成的索引，适合与其列顺序相符的查询条件。','複数の列を組み合わせたインデックス。列の順序が検索条件に影響する。','A composite index covers multiple columns and its column order matters.','WHERE句とORDER BY句に合わせて複合インデックスを設計する。','数据库',0,'composite index|复合索引'),
('it-local-migration','データベースマイグレーション','ja','でーたべーすまいぐれーしょん','数据库迁移：以可追踪、可重复的脚本变更数据库结构或种子数据。','スクリプトでデータベース構造や初期データを段階的に変更すること。','A database migration applies versioned changes to schema or seed data.','マイグレーションの順序と適用履歴を管理する。','数据库',0,'database migration|migration|数据库迁移'),
('it-local-seed-data','シードデータ','ja','しーどでーた','种子数据：用于初始化应用或测试环境的预置数据。','初期化やテストのためにあらかじめ登録するデータ。','Seed data is preloaded data used to initialize an application or test environment.','シードデータには固定IDを付け、再実行可能にする。','数据库',0,'seed data|初始化数据'),
('it-local-rollback','ロールバック','ja','ろーるばっく','回滚：撤销尚未提交的数据库事务或恢复到之前可用状态。','未確定のトランザクションを取り消す、または前の状態に戻す操作。','Rollback undoes a transaction or restores a prior state.','更新に失敗したためトランザクションをロールバックする。','数据库',0,'rollback|回滚'),
('it-local-deadlock','デッドロック','ja','でっどろっく','死锁：多个事务或线程互相等待对方释放资源，导致无法继续。','複数の処理が互いの資源解放を待ち続け、進行できなくなる状態。','A deadlock occurs when processes wait indefinitely for each other''s resources.','トランザクションの順序を見直してデッドロックを減らす。','数据库与并发',0,'deadlock|死锁'),
('it-local-ip-address','IPアドレス','ja','あいぴーあどれす','IP 地址：用于在 IP 网络中标识网络接口的地址。','IPネットワーク上のインターフェースを識別するアドレス。','An IP address identifies an interface on an IP network.','接続先のIPアドレスとポート番号を確認する。','网络',0,'IP address|IP地址'),
('it-local-subnet-mask','サブネットマスク','ja','さぶねっとますく','子网掩码：用于区分 IP 地址中的网络部分和主机部分。','IPアドレスのネットワーク部とホスト部を区別するための値。','A subnet mask identifies the network and host portions of an IPv4 address.','サブネットマスクを誤ると通信できないことがある。','网络',0,'subnet mask|子网掩码'),
('it-local-gateway','デフォルトゲートウェイ','ja','でふぉるとげーとうぇい','默认网关：主机向其他网络发送数据时使用的下一跳设备。','他のネットワーク宛ての通信を送る際に利用する次の中継先。','A default gateway forwards traffic toward other networks.','別ネットワークに接続できない場合はデフォルトゲートウェイを確認する。','网络',0,'default gateway|gateway|默认网关'),
('it-local-tcp','TCP','ja','てぃーしーぴー','传输控制协议：提供面向连接、可靠、有序的字节流传输。','接続を確立し、データの到達や順序を保証するトランスポート層プロトコル。','TCP provides reliable, ordered byte-stream delivery.','TCP接続の確立と切断の流れを確認する。','网络',0,'transmission control protocol|传输控制协议'),
('it-local-udp','UDP','ja','ゆーでぃーぴー','用户数据报协议：不保证送达和顺序，开销较低的传输层协议。','到達や順序を保証しない、比較的軽量なトランスポート層プロトコル。','UDP is a lightweight transport protocol without delivery or ordering guarantees.','リアルタイム性を重視する通信ではUDPが使われる場合がある。','网络',0,'user datagram protocol|用户数据报协议'),
('it-local-port-number','ポート番号','ja','ぽーとばんごう','端口号：用于区分同一主机上不同网络服务或应用端点的数字。','同じホスト上の通信先サービスを区別する番号。','A port number identifies a service endpoint on a host.','HTTPSでは通常443番ポートを使用する。','网络',0,'port number|端口|端口号'),
('it-local-firewall','ファイアウォール','ja','ふぁいあうぉーる','防火墙：根据规则允许或阻断网络流量的安全控制。','定められたルールに従って通信を許可または遮断する仕組み。','A firewall filters network traffic according to security rules.','必要な通信だけを許可するファイアウォールルールを設定する。','网络安全',0,'firewall|防火墙'),
('it-local-reverse-proxy','リバースプロキシ','ja','りばーすぷろきし','反向代理：代表后端服务器接收客户端请求并转发的服务器。','クライアントからの要求を受け、背後のサーバーへ転送する仕組み。','A reverse proxy receives client requests and forwards them to backend servers.','リバースプロキシでTLS終端や経路振り分けを行う。','网络',0,'reverse proxy|反向代理'),
('it-local-load-balancer','ロードバランサー','ja','ろーどばらんさー','负载均衡器：将请求分配到多个服务器以分散负载并提高可用性。','複数のサーバーに通信や処理負荷を分散する仕組み。','A load balancer distributes requests across servers.','ヘルスチェックに失敗したサーバーを振り分け先から外す。','网络与云',0,'load balancer|负载均衡'),
('it-local-websocket','WebSocket','ja','うぇぶそけっと','WebSocket：在客户端与服务器之间建立可双向持续通信的协议。','クライアントとサーバー間で双方向の継続的な通信を行うプロトコル。','WebSocket enables persistent, bidirectional communication.','リアルタイム更新にはWebSocketを利用できる。','网络与Web',0,'WebSocket protocol|WebSocket协议'),
('it-local-ssh','SSH','ja','えすえすえいち','安全外壳协议：用于加密远程登录和其他安全网络操作的协议。','リモートログインなどを安全に行うための暗号化プロトコル。','SSH provides encrypted remote access and related functions.','公開鍵認証を設定してSSH接続する。','网络安全',0,'secure shell|安全外壳协议'),
('it-local-vpn','VPN','ja','ぶいぴーえぬ','虚拟专用网络：通过逻辑隧道在共享或不可信网络上建立受保护的连接。','公衆ネットワークなどを通じて保護された論理的な通信経路を構築する仕組み。','A VPN creates a protected logical connection over an underlying network.','VPN接続中も端末のセキュリティ対策は必要である。','网络安全',0,'virtual private network|虚拟专用网络'),
('it-local-latency','レイテンシ','ja','れいてんし','延迟：请求发出到获得响应或数据到达所需的时间。','要求を送ってから応答が得られるまでの時間。','Latency is the time between an action and its response.','キャッシュで応答レイテンシを改善する。','性能',0,'latency|延迟|応答時間'),
('it-local-throughput','スループット','ja','するーぷっと','吞吐量：单位时间内系统实际处理或传输的数据量。','単位時間あたりに処理または転送できるデータ量。','Throughput measures how much work or data is processed per unit time.','負荷試験でスループットを測定する。','性能',0,'throughput|吞吐量'),
('it-local-packet-loss','パケット損失','ja','ぱけっとそんしつ','丢包：网络传输中的数据包未能到达目的地。','送信したパケットが宛先まで届かないこと。','Packet loss occurs when transmitted packets fail to reach their destination.','パケット損失が増えると音声や映像が乱れることがある。','网络',0,'packet loss|丢包'),
('it-local-container','コンテナ','ja','こんてな','容器：将应用及其依赖隔离打包、以一致方式运行的轻量环境。','アプリケーションと依存関係を分離して実行するための軽量な環境。','A container packages an application and its dependencies in an isolated environment.','開発環境をコンテナで統一する。','云与部署',0,'container|容器'),
('it-local-docker','Docker','ja','どっかー','容器化平台和工具生态，用于构建、分发和运行容器。','コンテナイメージの作成、配布、実行などに使うプラットフォームとツール。','Docker provides tools for building, distributing, and running containers.','Dockerfileを使ってアプリの実行環境を定義する。','云与部署',0,'Docker platform|容器平台'),
('it-local-kubernetes','Kubernetes','ja','くーばねてぃす','容器编排平台：自动化管理容器的部署、扩缩容、调度与恢复。','コンテナの配置、拡張、再起動などを自動化するオーケストレーション基盤。','Kubernetes orchestrates container deployment, scaling, and recovery.','Kubernetesでレプリカ数を調整する。','云与部署',0,'K8s|Kube|容器编排'),
('it-local-deployment','デプロイ','ja','でぷろい','部署/发布：将应用或版本安装、发布到指定运行环境。','アプリケーションや変更を対象環境に反映すること。','Deployment releases an application or version into an environment.','本番デプロイ前にテスト結果を確認する。','DevOps',0,'deploy|deployment|部署|发布'),
('it-local-environment-variable','環境変数','ja','かんきょうへんすう','环境变量：由运行环境向进程传递配置值的机制。','実行環境からプロセスへ設定値を渡すための仕組み。','An environment variable passes configuration into a process.','APIキーをソースコードに直書きせず環境変数やSecretsで管理する。','DevOps与安全',0,'environment variable|env var|环境变量'),
('it-local-secret-management','シークレット管理','ja','しーくれっとかんり','机密凭据管理：安全存储和使用令牌、密码、API 密钥等敏感值。','トークンやパスワード、APIキーなどを安全に保管・利用すること。','Secret management securely stores and provides sensitive credentials.','秘密情報をリポジトリへコミットしない。','DevOps与安全',0,'secret management|credential management|密钥管理|凭据管理'),
('it-local-staging-environment','ステージング環境','ja','すてーじんぐかんきょう','预发布环境：用于在上线前尽量接近生产环境地验证变更。','本番に近い条件でリリース前の変更を検証する環境。','A staging environment validates changes before production release.','ステージング環境でマイグレーションを検証する。','DevOps',0,'staging environment|预发布环境'),
('it-local-production-environment','本番環境','ja','ほんばんかんきょう','生产环境：实际向用户提供服务的运行环境。','実際の利用者へサービスを提供する環境。','The production environment serves real users and workloads.','本番環境へ反映する前にロールバック手順を準備する。','DevOps',0,'production environment|prod|生产环境'),
('it-local-blue-green-deployment','ブルーグリーンデプロイ','ja','ぶるーぐりーんでぷろい','蓝绿部署：准备两套环境，在验证后切换流量以降低发布风险。','2つの環境を用意し、確認後にトラフィックの向き先を切り替えるリリース方式。','Blue-green deployment switches traffic between two environments.','切り替え前に新環境のヘルスチェックを行う。','DevOps',0,'blue green deployment|蓝绿部署'),
('it-local-canary-release','カナリアリリース','ja','かなりありりーす','金丝雀发布：先让少量用户或流量使用新版本，再逐步扩大范围。','少量のユーザーやトラフィックから新バージョンを段階的に公開する方式。','A canary release exposes a new version to a small portion of traffic first.','エラー率を監視しながらカナリアリリースを拡大する。','DevOps',0,'canary deployment|canary release|金丝雀发布'),
('it-local-iac','Infrastructure as Code','ja','あいえーしー','基础设施即代码：用可版本化的配置文件描述和管理基础设施。','インフラ構成をコードや宣言的な設定ファイルで管理する考え方。','Infrastructure as Code manages infrastructure through versioned definitions.','本番インフラの変更をコードレビューに通す。','云与DevOps',0,'IaC|infrastructure as code|基础设施即代码'),
('it-local-observability','可観測性','ja','かかんそくせい','可观测性：借助日志、指标和追踪推断系统内部状态的能力。','ログ、メトリクス、トレースなどからシステム内部の状態を把握する能力。','Observability helps infer internal system state from outputs such as logs, metrics, and traces.','障害調査のためにログとメトリクスを関連付ける。','运维',0,'observability|可观测性'),
('it-local-metric','メトリクス','ja','めとりくす','指标：按时间记录的数值，用于观察性能、错误率和资源使用情况。','性能やエラー率、リソース使用量などを数値で継続観測するデータ。','A metric is a measured value used to monitor system behavior.','応答時間とエラー率のメトリクスを監視する。','运维',0,'metrics|metric|监控指标'),
('it-local-distributed-tracing','分散トレーシング','ja','ぶんさんとれーしんぐ','分布式追踪：跟踪一次请求经过多个服务的调用链路和耗时。','リクエストが複数サービスを通過する経路や所要時間を追跡する手法。','Distributed tracing follows a request across services.','分散トレーシングで遅いサービスを特定する。','运维',0,'distributed tracing|分布式追踪'),
('it-local-sla','SLA','ja','えすえるえー','服务级别协议：服务提供方与客户约定的服务水平条款。','サービス提供者と利用者の間で合意するサービス水準に関する契約。','A service-level agreement defines committed service levels.','SLAに可用性と対応時間の条件を明記する。','服务管理',0,'service level agreement|服务级别协议'),
('it-local-slo','SLO','ja','えすえるおー','服务级别目标：用于衡量服务可靠性的具体目标值。','サービスの信頼性を評価するために設定する具体的な目標値。','A service-level objective is a target for a service reliability measure.','エラー予算をSLOに基づいて管理する。','服务管理',0,'service level objective|服务级别目标'),
('it-local-sli','SLI','ja','えすえるあい','服务级别指标：用于衡量服务实际表现的指标。','サービスの実際の水準を測定する指標。','A service-level indicator measures actual service performance.','可用性をSLIとして測定する。','服务管理',0,'service level indicator|服务级别指标'),
('it-local-cve','CVE','ja','しーぶいいー','通用漏洞披露编号：用于唯一标识公开披露的网络安全漏洞。','公開された脆弱性を識別するための共通識別子。','CVE identifiers uniquely reference publicly disclosed vulnerabilities.','CVE番号から対象ソフトウェアと修正情報を確認する。','网络安全',0,'Common Vulnerabilities and Exposures|漏洞编号'),
('it-local-cvss','CVSS','ja','しーぶいーえすえす','通用漏洞评分系统：按技术特征评估漏洞严重程度的评分框架。','脆弱性の深刻度を評価するための共通スコアリング基準。','CVSS scores the technical severity of vulnerabilities.','CVSSだけでなく実環境への影響も考慮して優先順位を決める。','网络安全',0,'Common Vulnerability Scoring System|漏洞评分'),
('it-local-zero-day','ゼロデイ脆弱性','ja','ぜろでいぜいじゃくせい','零日漏洞：在供应商有机会发布有效修复之前已被利用或公开的漏洞。','修正プログラムが広く利用可能になる前に悪用されるなど、対処が困難な脆弱性。','A zero-day vulnerability is exploited or disclosed before an effective patch is available.','ゼロデイ脆弱性の情報を受けたら影響と緩和策を確認する。','网络安全',0,'zero-day vulnerability|0day|零日漏洞'),
('it-local-attack-surface','攻撃対象領域','ja','こうげきたいしょうりょういき','攻击面：攻击者可能尝试利用的系统接口、资产和暴露点的集合。','攻撃者が利用できる可能性のあるインターフェースや資産の範囲。','The attack surface is the set of exposed points an attacker could target.','不要な公開ポートを閉じて攻撃対象領域を減らす。','网络安全',0,'attack surface|攻击面'),
('it-local-threat-modeling','脅威モデリング','ja','きょういもでりんぐ','威胁建模：系统地识别资产、威胁、攻击路径和应对措施的过程。','資産、脅威、攻撃経路、対策を体系的に整理する活動。','Threat modeling identifies assets, threats, attack paths, and mitigations.','設計段階で脅威モデリングを実施する。','安全设计',0,'threat modeling|威胁建模'),
('it-local-brute-force','ブルートフォース攻撃','ja','ぶるーとふぉーすこうげき','暴力破解：通过大量尝试候选密码或密钥寻找正确值的攻击。','多くのパスワード候補などを試して正解を探す攻撃。','A brute-force attack tries many possible credentials or keys.','試行回数制限と多要素認証でリスクを下げる。','网络安全',0,'brute force attack|暴力破解|穷举攻击'),
('it-local-rate-limit','レート制限','ja','れーとせいげん','速率限制：限制单位时间内的请求次数，以减轻滥用和过载。','一定時間内に許可するリクエスト数を制限する仕組み。','Rate limiting caps requests over a period to mitigate abuse and overload.','翻訳APIにレート制限を設けて過剰な呼び出しを防ぐ。','API安全',0,'rate limiting|请求限流|限流'),
('it-local-process','プロセス','ja','ぷろせす','进程：操作系统中正在执行的程序实例，拥有独立的资源上下文。','OS上で実行中のプログラムのインスタンス。','A process is an instance of a running program with its own execution context.','プロセスのメモリ使用量を確認する。','操作系统',0,'process|进程'),
('it-local-thread','スレッド','ja','すれっど','线程：进程中的执行路径；同一进程的线程通常共享部分资源。','プロセス内で処理を実行する流れ。通常、同じプロセスのスレッドは一部の資源を共有する。','A thread is an execution path within a process.','共有データへのアクセスを複数スレッドで同期する。','操作系统与并发',0,'thread|线程'),
('it-local-memory-leak','メモリリーク','ja','めもりりーく','内存泄漏：程序不再需要的内存未被释放或仍被引用，导致占用持续增长。','不要になったメモリが解放されない、または参照され続ける問題。','A memory leak causes memory usage to grow because memory is not released as intended.','長時間稼働でメモリリークが起きていないか監視する。','操作系统与性能',0,'memory leak|内存泄漏'),
('it-local-garbage-collection','ガベージコレクション','ja','がべーじこれくしょん','垃圾回收：自动回收程序已无法访问的对象所占用内存的机制。','使用されなくなったオブジェクトのメモリを自動回収する仕組み。','Garbage collection automatically reclaims memory from unreachable objects.','GCの停止時間が応答性能に影響する場合がある。','操作系统与运行时',0,'garbage collection|GC|垃圾回收'),
('it-local-race-condition','競合状態','ja','きょうごうじょうたい','竞态条件：结果取决于多个操作执行时序的程序缺陷。','複数の処理の実行順序によって結果が変わる不具合。','A race condition occurs when behavior depends on timing between concurrent operations.','共有カウンターを更新するときの競合状態に注意する。','并发',0,'race condition|竞态条件|数据竞争'),
('it-local-mutex','ミューテックス','ja','みゅーてっくす','互斥锁：确保同一时刻只有一个执行单元进入受保护的临界区。','同時に一つの実行単位だけが共有資源へ入れるようにする同期機構。','A mutex allows only one thread at a time into a protected critical section.','共有データを更新する範囲をミューテックスで保護する。','并发',0,'mutex|互斥锁'),
('it-local-algorithm','アルゴリズム','ja','あるごりずむ','算法：为解决问题而设计的一组明确步骤。','問題を解くための明確な手順。','An algorithm is a defined sequence of steps for solving a problem.','問題に合うアルゴリズムを選び、計算量を比較する。','计算机基础',0,'algorithm|算法'),
('it-local-data-structure','データ構造','ja','でーたこうぞう','数据结构：组织和存储数据以便高效访问和修改的方式。','データを効率的に保存・検索・更新するための構成方法。','A data structure organizes data for efficient access and updates.','用途に応じて適切なデータ構造を選択する。','计算机基础',0,'data structure|数据结构'),
('it-local-array','配列','ja','はいれつ','数组：按顺序存储一组元素，可通过索引访问。','要素を順序立てて格納し、添字でアクセスするデータ構造。','An array stores ordered elements that can be accessed by index.','配列のインデックス範囲を確認する。','数据结构',0,'array|数组'),
('it-local-linked-list','連結リスト','ja','れんけつりすと','链表：由节点和指针/引用连接而成的数据结构。','ノードを参照でつないだデータ構造。','A linked list connects nodes through references or pointers.','途中への挿入が多い処理では連結リストが候補になる。','数据结构',0,'linked list|链表'),
('it-local-stack','スタック','ja','すたっく','栈：遵循后进先出原则的数据结构。','後入れ先出し（LIFO）で要素を扱うデータ構造。','A stack follows last-in, first-out ordering.','関数呼び出しはスタックを利用する。','数据结构',0,'stack|栈|LIFO'),
('it-local-queue','キュー','ja','きゅー','队列：遵循先进先出原则的数据结构。','先入れ先出し（FIFO）で要素を扱うデータ構造。','A queue follows first-in, first-out ordering.','非同期処理の待ち行列にキューを使う。','数据结构',0,'queue|队列|FIFO'),
('it-local-hash-table','ハッシュテーブル','ja','はっしゅてーぶる','哈希表：通过哈希函数将键映射到存储位置，以支持快速查找。','ハッシュ関数でキーを格納位置に対応付けるデータ構造。','A hash table maps keys to locations using a hash function.','キーの検索回数が多いためハッシュテーブルを使う。','数据结构',0,'hash table|哈希表|散列表'),
('it-local-binary-search','二分探索','ja','にぶんたんさく','二分查找：在有序数据中反复缩小范围来寻找目标元素。','整列済みデータを半分ずつ絞り込んで目的の値を探す方法。','Binary search repeatedly halves a sorted search range.','二分探索を使うにはデータが適切に整列されている必要がある。','算法',0,'binary search|二分查找'),
('it-local-time-complexity','計算量','ja','けいさんりょう','计算复杂度：描述算法所需时间或空间随输入规模增长的情况。','入力規模に応じてアルゴリズムが必要とする時間や空間の増え方。','Complexity describes how time or space requirements grow with input size.','O(n log n)とO(n²)の計算量を比較する。','算法',0,'time complexity|计算复杂度|算法复杂度'),
('it-local-big-o','ビッグオー記法','ja','びっぐおーきほう','大 O 表示法：描述算法资源需求增长上界的渐近记法。','入力規模が大きくなるときの計算量の増加傾向を表す漸近記法。','Big O notation describes asymptotic growth of resource requirements.','単純な二重ループは一般にO(n²)の計算量になる。','算法',0,'Big O notation|Big-O|大O表示法'),
('it-local-machine-learning','機械学習','ja','きかいがくしゅう','机器学习：从数据中学习模式并用于预测、分类或生成等任务的方法。','データからパターンを学び、予測や分類などに利用する手法。','Machine learning learns patterns from data to perform tasks such as prediction or classification.','学習データと評価データを分けてモデルを評価する。','数据与AI',0,'machine learning|ML|机器学习'),
('it-local-data-serialization','シリアライズ','ja','しりあらいず','序列化：将对象或数据结构转换为便于存储或传输的格式。','オブジェクトなどを保存・転送できる形式に変換すること。','Serialization converts data structures into a storable or transmittable format.','API境界でデータをJSONにシリアライズする。','数据与API',0,'serialization|序列化'),
('it-local-deserialization','デシリアライズ','ja','でしりあらいず','反序列化：将序列化后的表示转换回数据结构或对象。','シリアライズされたデータを元の構造やオブジェクトへ戻すこと。','Deserialization converts serialized data back into a data structure.','外部から受け取ったデータのデシリアライズ後に検証する。','数据与API',0,'deserialization|反序列化'),
('it-local-http-protocol','HTTP','ja','えいちてぃーてぃーぴー','超文本传输协议：Web 客户端与服务器交换资源和控制信息的应用层协议。','Webクライアントとサーバーがリソースや制御情報をやり取りするプロトコル。','HTTP is an application-layer protocol for exchanging web resources.','HTTPメソッドとステータスコードを確認する。','网络与Web',0,'Hypertext Transfer Protocol|超文本传输协议'),
('it-local-https-protocol','HTTPS','ja','えいちてぃーてぃーぴーえす','HTTPS：通常指在 TLS 保护下传输的 HTTP 通信。','TLSで保護されたHTTP通信。','HTTPS is HTTP protected by TLS.','本番サイトではHTTPSを有効にする。','网络与Web安全',0,'HTTPS protocol|加密HTTP'),
('it-local-proxy-server','プロキシサーバー','ja','ぷろきしさーばー','代理服务器：代表客户端向目标服务器发出请求的中间服务器。','クライアントの代わりに接続先へ要求を送る中継サーバー。','A proxy server makes requests on behalf of clients.','社内ネットワークのプロキシ設定を確認する。','网络',0,'proxy server|代理服务器|正向代理'),
('it-local-dns-record','DNSレコード','ja','でぃーえぬえすれこーど','DNS 记录：描述域名相关信息的记录，如 A、AAAA、CNAME、MX 等。','ドメインに関するIPアドレスや別名、メール配送先などを示すレコード。','A DNS record stores information such as addresses, aliases, or mail routing.','CNAMEレコードの参照先を確認する。','网络',0,'DNS record|DNS记录'),
('it-local-ipv6','IPv6','ja','あいぴーぶいろく','互联网协议第六版：使用 128 位地址的 IP 协议版本。','128ビットのアドレスを利用するIPプロトコルのバージョン。','IPv6 is an IP version that uses 128-bit addresses.','IPv6環境で接続できるか確認する。','网络',0,'Internet Protocol version 6|互联网协议第六版'),
('it-local-dhcp','DHCP','ja','でぃーえいちしーぴー','动态主机配置协议：自动向客户端分配 IP 地址和其他网络配置。','端末にIPアドレスなどのネットワーク設定を自動配布するプロトコル。','DHCP automatically provides network configuration to clients.','DHCPリースの状態を確認する。','网络',0,'Dynamic Host Configuration Protocol|动态主机配置协议'),
('it-local-nat','NAT','ja','なっと','网络地址转换：在网络通信过程中转换 IP 地址或端口信息的机制。','通信時にIPアドレスやポート番号を変換する仕組み。','NAT translates network addresses and sometimes port numbers.','NATの設定により外部から直接到達できない場合がある。','网络',0,'network address translation|网络地址转换'),
('it-local-cdn','CDN','ja','しーでぃーえぬ','内容分发网络：借助分布式边缘节点靠近用户提供静态内容或其他服务。','分散したエッジ拠点からコンテンツを配信するネットワーク。','A CDN serves content from distributed edge locations closer to users.','画像や静的ファイルをCDNで配信する。','网络与云',0,'content delivery network|内容分发网络'),
('it-local-callback','コールバック','ja','こーるばっく','回调：作为参数传入、在特定时机由另一段代码调用的函数。','別の処理に渡され、特定のタイミングで呼び出される関数。','A callback is a function passed to be invoked later by another operation.','処理完了後のコールバックで結果を受け取る。','编程',0,'callback|回调函数'),
('it-local-promise','Promise','ja','ぷろみす','承诺对象：表示异步操作最终成功或失败结果的对象。','非同期処理の成功または失敗を表すオブジェクト。','A Promise represents the eventual success or failure of an asynchronous operation.','Promiseの拒否をcatchで処理する。','编程',0,'promise|异步Promise'),
('it-local-async-await','async/await','ja','あしんく・あうぇいと','异步语法：用更接近同步流程的语法编写基于 Promise 的异步代码。','Promiseを使った非同期処理を読みやすく記述する構文。','Async/await makes promise-based asynchronous code easier to read.','awaitする処理の失敗に備えてtry/catchを使う。','编程',0,'async await|异步等待'),
('it-local-api-endpoint','エンドポイント','ja','えんどぽいんと','接口端点：API 中可被请求的具体 URL 或操作入口。','APIでリクエストを受け付ける具体的なURLや処理の入口。','An endpoint is a specific API URL or operation that can receive requests.','エンドポイントごとに入力値を検証する。','API开发',0,'endpoint|API endpoint|接口端点'),
('it-local-request-response','リクエスト／レスポンス','ja','りくえすと・れすぽんす','请求与响应：客户端发送请求、服务器返回处理结果的交互模式。','クライアントが要求を送り、サーバーが結果を返す通信の流れ。','Request-response is a pattern in which a client sends a request and receives a response.','レスポンスコードと本文を確認する。','API开发',0,'request response|请求响应'),
('it-local-payload','ペイロード','ja','ぺいろーど','载荷：消息或请求中实际承载的数据部分。','通信メッセージやリクエストに含まれる実データ部分。','A payload is the data carried by a request or message.','受信したペイロードの型とサイズを検証する。','API开发',0,'payload|请求体数据|载荷'),
('it-local-input-validation','入力値検証','ja','にゅうりょくちけんしょう','输入校验：检查用户输入是否符合类型、长度、范围和业务规则。','入力値が型、長さ、範囲、業務ルールを満たすか検証すること。','Input validation checks values against type, length, range, and business rules.','サーバー側でも入力値検証を必ず行う。','Web安全',0,'input validation|输入验证|入力検証'),
('it-local-output-encoding','出力エンコード','ja','しゅつりょくえんこーど','输出编码：按输出上下文转换特殊字符，以降低脚本注入风险。','出力先の文脈に応じて特殊文字を適切に変換すること。','Output encoding escapes characters for the output context to mitigate injection.','HTMLへ出力するときは文脈に応じたエンコードを行う。','Web安全',0,'output encoding|上下文编码|输出转义'),
('it-local-http-header','HTTPヘッダー','ja','えいちてぃーてぃーぴーへっだー','HTTP 头：携带请求或响应的元数据、控制信息和策略的字段集合。','リクエストやレスポンスの付加情報や制御情報を表すフィールド群。','HTTP headers carry metadata and policy information.','Content-TypeとCache-Controlヘッダーを確認する。','网络与Web',0,'HTTP header|HTTP头部'),
('it-local-content-security-policy','Content Security Policy','ja','こんてんと・せきゅりてぃ・ぽりしー','内容安全策略：通过响应头限制网页可加载或执行的资源来源。','Webページが読み込めるリソースや実行できるスクリプトを制限する仕組み。','Content Security Policy restricts the sources of scripts and other resources.','CSPで許可するスクリプトの出所を限定する。','Web安全',0,'CSP|内容安全策略'),
('it-local-environment','実行環境','ja','じっこうかんきょう','运行环境：程序实际运行所依赖的操作系统、配置、运行时和服务组合。','プログラムを実行するためのOS、設定、ランタイム、関連サービスなどの組み合わせ。','A runtime environment includes the OS, configuration, runtime, and dependent services.','ローカルと本番の実行環境の差分を確認する。','运维',0,'runtime environment|运行环境'),
('it-local-feature-flag','フィーチャーフラグ','ja','ふぃーちゃーふらぐ','功能开关：通过配置决定某项功能是否对特定用户或环境启用。','設定によって機能の有効・無効を切り替える仕組み。','A feature flag toggles functionality without requiring a new code deployment.','機能フラグで段階的に新機能を公開する。','软件发布',0,'feature flag|功能开关'),
('it-local-rollback-procedure','切り戻し手順','ja','きりもどしてじゅん','回退步骤：发布失败或出现异常时恢复到先前版本的操作流程。','リリース後に問題が発生した際、前の状態へ戻すための手順。','A rollback procedure restores a previous version after a failed release.','本番反映前に切り戻し手順を確認する。','软件发布',0,'rollback procedure|回退步骤|回滚方案');

-- 常用名词和缩写别名：可用中文、英语缩写或日语术语搜索同一条本地词条。
-- 若早期词库已有相同规范术语，保留原条目（其上方已补别名），不产生重复卡片。
DELETE FROM vocabulary
WHERE id LIKE 'it-local-%'
  AND EXISTS (
    SELECT 1 FROM vocabulary AS existing
    WHERE lower(existing.term) = lower(vocabulary.term)
      AND existing.id NOT LIKE 'it-local-%'
  );

CREATE INDEX IF NOT EXISTS idx_vocabulary_source_module ON vocabulary(source_module);
