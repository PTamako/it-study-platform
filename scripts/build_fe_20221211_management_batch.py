import json
from pathlib import Path

rows = [
 (45,'E-R図','E-R図の説明はどれか。',['オブジェクト指向モデルを表す図','時間や行動に応じた状態変化を表す図','対象世界を実体と関連の二つの概念で表す図','データの流れを視覚的に分かりやすく表す図'],'c','E-R図は実体と実体間の関連を表す。中文：E-R图用实体及其关系描述数据模型。'),
 (46,'カプセル化','オブジェクト指向で属性と振る舞いを一つにまとめた構造にすることを何というか。',['カプセル化','クラス化','集約化','汎化'],'a','属性と操作をまとめ、内部の詳細を隠す考え方がカプセル化。中文：封装把数据与操作组合起来，并隐藏内部细节。'),
 (47,'判定順序','売上レコードの処理区分ごとの出現比率が分かっている。区分を順に比較して判定する場合、全体の比較回数を少なくするのはどれか。',['出現比率が中間の区分から判定','出現比率が最も大きい区分から判定','出現比率が最も小さい区分から判定','どの順番でも比較回数は同じ'],'b','出現頻度が高い区分を先に判定すると、平均比較回数を抑えられる。中文：先判断出现概率最高的类别，可减少平均比较次数。'),
 (48,'リグレッションテスト','保守のための変更が、影響を受けないはずの箇所に影響していないことを確かめるテストはどれか。',['運用テスト','結合テスト','システムテスト','リグレッションテスト'],'d','変更に伴う意図しない影響を確かめるのは回帰テスト。中文：回归测试用于确认修改没有破坏原有功能。'),
 (50,'バーンダウンチャート','アジャイル開発で用いるバーンダウンチャートはどれか。いずれも横軸は時間で、破線は予定または予想、実線は実績とする。',['縦軸は残作業量で、時間とともに減少する曲線','縦軸は発生不具合数で、U字型に増減する曲線','縦軸は累積バグ数で、増加して次第に横ばいになる曲線','縦軸は要員数で、段階的に増減する曲線'],'a','残作業量の予定と実績を時間軸上で比較する。中文：燃尽图以时间为横轴、剩余工作量为纵轴，比较计划和实际的下降趋势。'),
 (52,'WBS','プロジェクトチームが実行する作業を上位の階層から下位の階層へ段階的に分解したものを何というか。例えばシステム開発を企画・要件定義へ分け、要件定義をさらに準備・利用者要求定義へ分ける。',['CPM','EVM','PERT','WBS'],'d','WBSは作業を階層的に分解した構成図。中文：WBS将项目工作逐层拆分为可管理的工作包。'),
 (54,'ファンクションポイント','機能の個数と重み係数は外部入力1個×4、外部出力2個×5、内部論理ファイル1個×10。全体の複雑さの補正係数が0.75のときファンクションポイント値はいくつか。',['18','24','30','32'],'a','(1×4+2×5+1×10)×0.75=18。中文：加权合计24，再乘补正系数0.75，得到18。'),
 (57,'運用データの取扱い','システム運用におけるデータの取扱いとして適切なものはどれか。',['エラーデータを発生元と運用部門で分担して修正する','原始データの信ぴょう性確認と受渡管理は運用部門が担当するのがよい','発生元での修正に時間がかかるので運用部門にできるだけ任せる','入力データのエラー検出は処理段階より入力段階で行う方が検出・修正の効率がよい'],'d','入力時に検出すれば、発生元に近い場所で早期に修正できる。中文：输入阶段及早发现错误，通常更容易在来源处修正。'),
 (58,'システム監査技法','データ生成から入力、処理、出力、活用までの過程と組み込まれたコントロールを監査人が書面上または実際に追跡する技法はどれか。',['インタビュー法','ウォークスルー法','監査モジュール法','ペネトレーションテスト法'],'b','データ処理の流れに沿って手続きと統制を追跡するのがウォークスルー法。中文：穿行测试沿数据流追踪处理过程和控制措施。'),
 (59,'監査フォローアップ','システム監査人が改善提案をフォローアップする方法として適切なものはどれか。',['監査対象部門の長に改善の実施を指示する','対象部門の改善実施プロジェクトを管理する','対象部門の改善状況をモニタリングする','改善提案を示した上で改善実施計画を策定する'],'c','監査人は独立性を保ちながら改善状況を確認する。中文：审计人员保持独立性，跟踪被审计部门的整改情况。'),
 (60,'利用者受入テスト','開発委託先から納品された成果物について、利用者受入テストの適切性を確認する監査の着眼点はどれか。',['委託者の計画に従い受託者が利用者受入テストを実施する','受託者が成果物と共に利用者受入テスト計画書を納品する','委託者が納品物に対し要件定義に基づいて利用者受入テストを実施する','監査人が納品物に対する利用者受入テスト計画を策定する'],'c','受入側である委託者が要件に沿って成果物を検証する。中文：委托方应依据需求定义对交付成果实施用户验收测试。'),
]
paper='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20221211_FE.pdf'
answer='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20221211_FE.pdf'
def sql(x): return "'"+str(x).replace("'","''")+"'"
questions=[]; occurrences=[]
for n,topic,prompt,options,key,explanation in rows:
    ident=f'fe-exempt-2022-20221211-q{n:02}'
    opts=json.dumps([dict(id='abcd'[i],text=x) for i,x in enumerate(options)],ensure_ascii=False,separators=(',',':'))
    values=[ident,'exam-fe',topic,'standard','single_choice',f'【IPA 2022年度 修了認定試験 2022-12-11 問{n}・改編】'+prompt,opts,json.dumps(key),explanation,'licensed',paper,'ja','A','explicit','standard','fe_exemption']
    questions.append('('+','.join(map(sql,values))+')')
    occurrences.append('('+','.join(map(sql,['2022-12-11',n,'2022',ident,key,paper,answer]))+')')
# IPA's 2022 A sample question 42 reproduces this exact sitting question.
occurrences.append('('+','.join(map(sql,['2022-12-11',51,'2022','fe-ipa-sample-2022-a-042','d',paper,answer]))+')')
out='-- IPA 2022 December: source-reviewed development and management questions.\n'
out+='INSERT OR IGNORE INTO questions (id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin) VALUES\n'+',\n'.join(questions)+';\n'
out+='INSERT OR IGNORE INTO fe_exemption_occurrences (sitting_date,original_question,fiscal_year,canonical_question_id,official_answer,question_url,answer_url) VALUES\n'+',\n'.join(occurrences)+';\n'
Path(__file__).resolve().parents[1].joinpath('migrations/0174_fe_exemption_20221211_management.sql').write_text(out,encoding='utf-8')
