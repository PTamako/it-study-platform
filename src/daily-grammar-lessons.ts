/** Original short-form grammar lessons, not official ETS/TOEIC or JLPT questions.
 * Both languages have structured bilingual explanations and two authored items
 * per topic. Compiled into static frontend assets: zero D1/AI calls per lesson.
 */
export type GrammarLanguage = 'ja' | 'en'
export type GrammarQuestion = {
  prompt: string
  options: string[]
  correct: number
  whyZh: string
  whyJa: string
}
export type GrammarLesson = {
  id: string
  point: string
  zh: string
  ja: string
  form: string
  example: string
  translation: string
  tipZh: string
  tipJa: string
  questions: GrammarQuestion[]
}
const GRAMMAR: Record<GrammarLanguage, GrammarLesson[]> = {
  "ja": [
    {
      "id": "ja-01",
      "point": "～ものの",
      "zh": "虽然……但是……；前后存在现实与预期的落差",
      "ja": "逆接の「～ものの」。予想と現実の差を表す",
      "form": "動詞普通形／い形容詞＋ものの；な形容詞語幹＋なものの；名詞＋であるものの",
      "example": "原因は分かったものの、修正にはもう少し時間がかかりそうです。",
      "translation": "虽然找到原因了，但修复似乎还要花一些时间。",
      "tipZh": "比「けど」更书面、正式；后项通常是未解决的问题或意外结果。",
      "tipJa": "「けど」より改まった表現で、後件には予想と異なる状況が続きます。",
      "questions": [
        {
          "prompt": "仕様は理解した___、実装方法はまだ決まっていません。",
          "options": [
            "ものの",
            "に先立って",
            "次第で",
            "に限って"
          ],
          "correct": 0,
          "whyZh": "理解了但还没决定实现方法，使用逆接「ものの」。",
          "whyJa": "理解はしたが未決定という逆接なので「ものの」。"
        },
        {
          "prompt": "準備した___、当日は使う機会がありませんでした。",
          "options": [
            "とは別に",
            "ものの",
            "に伴い",
            "ばかり"
          ],
          "correct": 1,
          "whyZh": "虽然准备了但没机会使用，选择「ものの」。",
          "whyJa": "準備したのに使わなかった、という逆接です。"
        }
      ]
    },
    {
      "id": "ja-02",
      "point": "～に越したことはない",
      "zh": "最好……；在几个方案中某个做法更理想",
      "ja": "～するのが一番望ましいという意味",
      "form": "動詞辞書形／ない形 + に越したことはない",
      "example": "余裕を持って確認するに越したことはありません。",
      "translation": "最好留出充足时间进行确认。",
      "tipZh": "表示建议而非绝对义务；职场里比「絶対に」更柔和。",
      "tipJa": "義務ではなく、望ましい選択を示します。",
      "questions": [
        {
          "prompt": "トラブルを防ぐには、早めにテストする___。",
          "options": [
            "かねません",
            "に越したことはありません",
            "とはいえ",
            "次第です"
          ],
          "correct": 1,
          "whyZh": "最好早点测试，用「に越したことはありません」。",
          "whyJa": "早めのテストが望ましいという意味です。"
        },
        {
          "prompt": "出発前に予約を確認しておく___。",
          "options": [
            "に越したことはない",
            "にかかわらず",
            "に先立つ",
            "ものの"
          ],
          "correct": 0,
          "whyZh": "出发前确认预约是理想做法。",
          "whyJa": "確認しておくのが望ましいことを示します。"
        }
      ]
    },
    {
      "id": "ja-03",
      "point": "～わけにはいかない",
      "zh": "由于责任、常识或处境，不能……",
      "ja": "事情や立場から～できない",
      "form": "動詞辞書形 + わけにはいかない",
      "example": "確認が取れるまで、本番環境に反映するわけにはいきません。",
      "translation": "在确认之前，不能把修改部署到生产环境。",
      "tipZh": "强调外部责任或原则上的不可行，不只是能力不足。",
      "tipJa": "能力の問題ではなく、責任や事情から実行できないことです。",
      "questions": [
        {
          "prompt": "まだ承認されていないので、公開する___。",
          "options": [
            "に先立ち",
            "わけにはいきません",
            "次第です",
            "ものの"
          ],
          "correct": 1,
          "whyZh": "未批准，所以原则上不能发布。",
          "whyJa": "承認前に公開できない事情があるので「わけにはいきません」。"
        },
        {
          "prompt": "約束した以上、途中でやめる___。",
          "options": [
            "に越します",
            "わけにはいかない",
            "に伴います",
            "とは限らない"
          ],
          "correct": 1,
          "whyZh": "已经约定，不能中途放弃。",
          "whyJa": "約束した立場からやめられないという意味です。"
        }
      ]
    },
    {
      "id": "ja-04",
      "point": "～にかかわらず",
      "zh": "无论……都……；不受前项条件影响",
      "ja": "条件や状況の違いに関係なく",
      "form": "名詞 + にかかわらず",
      "example": "経験の有無にかかわらず、研修に参加できます。",
      "translation": "无论是否有经验，都可以参加培训。",
      "tipZh": "常和「有無」「年齢」「天候」等名词搭配。",
      "tipJa": "「有無」「年齢」「天候」などとよく使います。",
      "questions": [
        {
          "prompt": "国籍___、応募できます。",
          "options": [
            "にかかわらず",
            "ものの",
            "次第で",
            "を踏まえ"
          ],
          "correct": 0,
          "whyZh": "不论国籍，用「にかかわらず」。",
          "whyJa": "国籍に関係なくという意味です。"
        },
        {
          "prompt": "天候___、イベントは開催します。",
          "options": [
            "とはいえ",
            "にかかわらず",
            "に先立ち",
            "かねない"
          ],
          "correct": 1,
          "whyZh": "无论天气如何举办活动。",
          "whyJa": "天候の違いに関係なく開催します。"
        }
      ]
    },
    {
      "id": "ja-05",
      "point": "～を踏まえて",
      "zh": "基于……、考虑……后采取行动",
      "ja": "情報や意見を考慮した上で",
      "form": "名詞 + を踏まえて",
      "example": "お客様のご意見を踏まえて、画面の構成を見直しました。",
      "translation": "我们根据客户意见调整了页面结构。",
      "tipZh": "适用于报告、需求讨论、设计决策等职场场景。",
      "tipJa": "議論や検討の材料を反映するときに便利です。",
      "questions": [
        {
          "prompt": "テスト結果___、修正方針を決めます。",
          "options": [
            "を踏まえて",
            "に越して",
            "ものの",
            "次第"
          ],
          "correct": 0,
          "whyZh": "根据测试结果决定修改方案。",
          "whyJa": "結果を考慮した上で決めるので「を踏まえて」。"
        },
        {
          "prompt": "現場の状況___、スケジュールを調整してください。",
          "options": [
            "にもかかわらず",
            "を踏まえて",
            "に先立ち",
            "ざるを得ず"
          ],
          "correct": 1,
          "whyZh": "考虑现场情况后调整时间表。",
          "whyJa": "現場の状況を考慮する表現です。"
        }
      ]
    },
    {
      "id": "ja-06",
      "point": "～に伴って",
      "zh": "随着……同时出现相应变化",
      "ja": "ある変化に合わせて別の変化が起こる",
      "form": "名詞／動詞辞書形 + に伴って",
      "example": "利用者の増加に伴って、サーバーの負荷も高くなっています。",
      "translation": "随着用户增加，服务器负载也在上升。",
      "tipZh": "用于客观描述两个变化之间的联动。",
      "tipJa": "一方の変化に応じて別の変化が生じる場合に使います。",
      "questions": [
        {
          "prompt": "物価の上昇___、生活費も増えました。",
          "options": [
            "に伴って",
            "とはいえ",
            "を問わず",
            "次第で"
          ],
          "correct": 0,
          "whyZh": "随着物价上涨，生活费也增加。",
          "whyJa": "物価上昇に応じて生活費が増える関係です。"
        },
        {
          "prompt": "システム更新___、操作手順が一部変わります。",
          "options": [
            "ものの",
            "に伴い",
            "に越したことはなく",
            "かねず"
          ],
          "correct": 1,
          "whyZh": "随着系统更新，操作流程改变。",
          "whyJa": "更新に合わせて変更が生じるので「に伴い」。"
        }
      ]
    },
    {
      "id": "ja-07",
      "point": "～に先立って",
      "zh": "在某件重要事情正式开始之前先……",
      "ja": "本番や重要な行事の前に",
      "form": "名詞 + に先立って",
      "example": "リリースに先立って、最終確認を行います。",
      "translation": "正式上线前进行最终确认。",
      "tipZh": "常用于上线、会议、开业、发布等正式活动。",
      "tipJa": "正式なイベントや重要な手続きの前段階を示します。",
      "questions": [
        {
          "prompt": "会議___、資料を共有しました。",
          "options": [
            "に先立って",
            "に伴って",
            "ものの",
            "かねない"
          ],
          "correct": 0,
          "whyZh": "会议之前先分享资料。",
          "whyJa": "会議より前の準備を示す「に先立って」。"
        },
        {
          "prompt": "開店___、スタッフ向けの研修を実施します。",
          "options": [
            "とはいえ",
            "に先立ち",
            "を踏まえ",
            "わけにはいかず"
          ],
          "correct": 1,
          "whyZh": "开店前进行员工培训。",
          "whyJa": "開店前に行う準備なので「に先立ち」。"
        }
      ]
    },
    {
      "id": "ja-08",
      "point": "～次第",
      "zh": "一……就……；某个动作完成后立即进行下一步",
      "ja": "～したらすぐに",
      "form": "動詞ます形の語幹 + 次第",
      "example": "確認でき次第、ご連絡いたします。",
      "translation": "确认后会立即与您联系。",
      "tipZh": "「次第」接ます形去掉ます后的词干，常见于职场联络；不要与「次第で」混淆。",
      "tipJa": "動詞のます形の語幹に接続し、完了後すぐの行動を伝えます。",
      "questions": [
        {
          "prompt": "結果が分かり___、お知らせします。",
          "options": [
            "ものの",
            "次第",
            "に先立ち",
            "かねません"
          ],
          "correct": 1,
          "whyZh": "分かります→分かり次第，得知结果后立即通知。",
          "whyJa": "分かります→分かり次第 です。"
        },
        {
          "prompt": "資料が届き___、内容を確認します。",
          "options": [
            "次第",
            "ものの",
            "に越して",
            "とはいえ"
          ],
          "correct": 0,
          "whyZh": "一收到资料就确认。",
          "whyJa": "届きます→届き次第 が適切です。"
        }
      ]
    },
    {
      "id": "ja-09",
      "point": "～ざるを得ない",
      "zh": "不得不……；没有其他选择",
      "ja": "ほかに方法がなく、そうするしかない",
      "form": "動詞ない形の語幹 + ざるを得ない（する→せざるを得ない）",
      "example": "不具合が解消しないため、公開を延期せざるを得ません。",
      "translation": "由于故障未解决，不得不延期发布。",
      "tipZh": "「する」的特殊接续是「せざるを得ない」；略正式。",
      "tipJa": "「する」は例外的に「せざるを得ない」です。",
      "questions": [
        {
          "prompt": "大雪のため、出張を中止___。",
          "options": [
            "しざるを得ません",
            "せざるを得ません",
            "するに越しません",
            "し次第です"
          ],
          "correct": 1,
          "whyZh": "する→せざるを得ない。",
          "whyJa": "する の場合は「せざるを得ない」です。"
        },
        {
          "prompt": "予算が足りず、計画を見直さ___。",
          "options": [
            "ざるを得ません",
            "ないものの",
            "次第では",
            "に先立ちます"
          ],
          "correct": 0,
          "whyZh": "見直す→見直さざるを得ない。",
          "whyJa": "見直す→見直さざるを得ない です。"
        }
      ]
    },
    {
      "id": "ja-10",
      "point": "～かねない",
      "zh": "有可能发生不好的结果；需警惕",
      "ja": "好ましくない結果になる可能性がある",
      "form": "動詞ます形の語幹 + かねない",
      "example": "このまま放置すると、情報漏えいにつながりかねません。",
      "translation": "这样放任不管，可能导致信息泄露。",
      "tipZh": "通常强调负面风险，不等于普通中性的「かもしれない」。",
      "tipJa": "一般に好ましくない可能性・リスクを表します。",
      "questions": [
        {
          "prompt": "確認を怠ると、大きなミスを招き___。",
          "options": [
            "かねません",
            "ものの",
            "次第です",
            "に伴います"
          ],
          "correct": 0,
          "whyZh": "疏忽检查可能导致严重错误，表达风险。",
          "whyJa": "ミスという悪い結果の可能性を示します。"
        },
        {
          "prompt": "個人情報を公開すると、問題になり___。",
          "options": [
            "に越したことはありません",
            "かねません",
            "に先立ちます",
            "ものの"
          ],
          "correct": 1,
          "whyZh": "公开个人信息可能产生问题，用「かねません」。",
          "whyJa": "好ましくない結果を警告しています。"
        }
      ]
    },
    {
      "id": "ja-11",
      "point": "～とはいえ",
      "zh": "虽说……但……；承认前项后提出限制",
      "ja": "そうであることは認めるが",
      "form": "普通形／名詞 + とはいえ",
      "example": "経験があるとはいえ、確認を省略してはいけません。",
      "translation": "虽说有经验，也不能省略检查。",
      "tipZh": "可以用于提醒别人避免因某个优点而忽略风险。",
      "tipJa": "前件を認めた上で、後件で注意や制限を述べます。",
      "questions": [
        {
          "prompt": "便利___、安全性の確認は必要です。",
          "options": [
            "とはいえ",
            "次第",
            "に伴って",
            "を踏まえ"
          ],
          "correct": 0,
          "whyZh": "虽说方便，但仍需确认安全性。",
          "whyJa": "便利だと認めつつ注意点を述べます。"
        },
        {
          "prompt": "新人___、基本的なルールは守る必要があります。",
          "options": [
            "を踏まえて",
            "とはいえ",
            "に先立ち",
            "かねなく"
          ],
          "correct": 1,
          "whyZh": "即使是新人，也需要遵守基本规则。",
          "whyJa": "新人であることを認めてもルールは必要です。"
        }
      ]
    },
    {
      "id": "ja-12",
      "point": "～にあたって",
      "zh": "值此……之际；开始重要行动时需要做准备或说明",
      "ja": "重要な行動を始める場面で",
      "form": "名詞／動詞辞書形 + にあたって",
      "example": "新しいシステムを導入するにあたって、担当者向けの説明会を開きます。",
      "translation": "在引入新系统之际，会为负责人召开说明会。",
      "tipZh": "比「とき」更正式，常见于商务通知和正式说明。",
      "tipJa": "「とき」より改まった表現で、導入・着任などと相性が良いです。",
      "questions": [
        {
          "prompt": "契約の締結___、内容を十分に確認してください。",
          "options": [
            "にあたって",
            "ものの",
            "かねません",
            "次第"
          ],
          "correct": 0,
          "whyZh": "签订合同前后重要阶段进行确认。",
          "whyJa": "契約締結という重要な機会なので「にあたって」。"
        },
        {
          "prompt": "新店舗を開く___、地域の皆様にご挨拶いたします。",
          "options": [
            "とはいえ",
            "にあたって",
            "にかかわらず",
            "次第で"
          ],
          "correct": 1,
          "whyZh": "开新店之际向附近居民致意。",
          "whyJa": "新店舗を開く重要な場面を表します。"
        }
      ]
    }
  ],
  "en": [
    {
      "id": "en-01",
      "point": "to do / doing",
      "zh": "动词不定式与动名词；注意 remember、stop 等动词意义变化",
      "ja": "不定詞と動名詞。remember・stop などは意味が変わる",
      "form": "remember to do = 记得要做；remember doing = 记得做过",
      "example": "Please remember to submit the report before Friday.",
      "translation": "请记得在星期五之前提交报告。",
      "tipZh": "remember to do 表示未来需要完成的事；remember doing 表示回忆过去做过的事。",
      "tipJa": "remember to do はこれから行うこと、remember doing は過去に行った記憶を表します。",
      "questions": [
        {
          "prompt": "Please remember ___ the receipt with your expense report.",
          "options": [
            "attach",
            "to attach",
            "attaching",
            "attached"
          ],
          "correct": 1,
          "whyZh": "提醒将来要附上收据，用 remember to attach。",
          "whyJa": "これから添付する行為なので remember to attach。"
        },
        {
          "prompt": "I remember ___ Ms. Sato at last year's conference.",
          "options": [
            "meet",
            "to meet",
            "meeting",
            "met"
          ],
          "correct": 2,
          "whyZh": "回忆去年见过某人，使用 remember meeting。",
          "whyJa": "過去に会った記憶なので remember meeting。"
        }
      ]
    },
    {
      "id": "en-02",
      "point": "介词 + -ing",
      "zh": "介词后面使用动名词，而不是动词原形",
      "ja": "前置詞の後ろには動名詞を置く",
      "form": "look forward to + -ing / be interested in + -ing",
      "example": "We look forward to working with your team.",
      "translation": "我们期待与你们团队合作。",
      "tipZh": "look forward to 里的 to 是介词，不是不定式标记。",
      "tipJa": "look forward to の to は不定詞ではなく前置詞です。",
      "questions": [
        {
          "prompt": "We look forward to ___ from you soon.",
          "options": [
            "hear",
            "hearing",
            "heard",
            "to hear"
          ],
          "correct": 1,
          "whyZh": "介词 to 后接 hearing。",
          "whyJa": "look forward to の後ろは hearing です。"
        },
        {
          "prompt": "She is responsible for ___ the monthly figures.",
          "options": [
            "review",
            "reviews",
            "reviewing",
            "to review"
          ],
          "correct": 2,
          "whyZh": "for 是介词，后接 reviewing。",
          "whyJa": "for は前置詞なので reviewing が続きます。"
        }
      ]
    },
    {
      "id": "en-03",
      "point": "主谓一致",
      "zh": "动词单复数要与真正的主语一致",
      "ja": "動詞の単複は真の主語に一致させる",
      "form": "Each of the employees is ... / The employees are ...",
      "example": "Each of the applicants is required to sign the form.",
      "translation": "每位申请人都必须签署表格。",
      "tipZh": "each、every 等表示单数；不要被 of 后面的复数名词干扰。",
      "tipJa": "each は単数扱いです。of 以下の複数形に引きずられないようにします。",
      "questions": [
        {
          "prompt": "Each of the invoices ___ checked before payment.",
          "options": [
            "are",
            "were",
            "is",
            "have"
          ],
          "correct": 2,
          "whyZh": "主语 Each 是单数，所以用 is。",
          "whyJa": "主語は Each なので is が適切です。"
        },
        {
          "prompt": "The results of the survey ___ available online.",
          "options": [
            "is",
            "are",
            "was",
            "has"
          ],
          "correct": 1,
          "whyZh": "主语 results 为复数，使用 are。",
          "whyJa": "主語 results が複数なので are。"
        }
      ]
    },
    {
      "id": "en-04",
      "point": "被动语态",
      "zh": "关注动作接受者：be + 过去分词",
      "ja": "動作の受け手を主語にする be + 過去分詞",
      "form": "The documents were sent yesterday.",
      "example": "All applications must be received by November 15.",
      "translation": "所有申请必须在11月15日前收到。",
      "tipZh": "情态动词后：must be + done；句中主语不执行动作。",
      "tipJa": "助動詞の後は must be + 過去分詞です。",
      "questions": [
        {
          "prompt": "The schedule ___ by the manager yesterday.",
          "options": [
            "approved",
            "was approved",
            "has approve",
            "approving"
          ],
          "correct": 1,
          "whyZh": "明确 yesterday 的过去时间，使用 was approved。",
          "whyJa": "yesterday があるので過去の受動態 was approved。"
        },
        {
          "prompt": "The new policy must ___ to all employees.",
          "options": [
            "explain",
            "be explained",
            "explaining",
            "explained"
          ],
          "correct": 1,
          "whyZh": "must 后被动结构为 be explained。",
          "whyJa": "must の後の受動態は be explained です。"
        }
      ]
    },
    {
      "id": "en-05",
      "point": "关系代词",
      "zh": "who 修饰人，which 修饰物，that 根据限制性从句使用",
      "ja": "who は人、which は物を修飾する",
      "form": "the colleague who ... / the document which ...",
      "example": "The colleague who handles orders is on leave.",
      "translation": "负责订单的同事正在休假。",
      "tipZh": "选择关系代词时先看先行词是人还是物，并看从句缺少什么成分。",
      "tipJa": "先行詞が人か物か、関係節で何が欠けているかを確かめます。",
      "questions": [
        {
          "prompt": "The engineer ___ fixed the server is away today.",
          "options": [
            "which",
            "who",
            "where",
            "whose"
          ],
          "correct": 1,
          "whyZh": "先行词 engineer 是人且作主语，选择 who。",
          "whyJa": "engineer は人で関係節の主語なので who。"
        },
        {
          "prompt": "The report ___ you requested is attached.",
          "options": [
            "where",
            "who",
            "which",
            "when"
          ],
          "correct": 2,
          "whyZh": "先行词 report 是物，which 合适。",
          "whyJa": "report は物なので which が適切です。"
        }
      ]
    },
    {
      "id": "en-06",
      "point": "条件句",
      "zh": "真实未来条件句：if 从句用现在时，主句用 will",
      "ja": "現実的な未来条件は if 節が現在形",
      "form": "If the shipment arrives, we will contact you.",
      "example": "If you have any questions, please contact our support team.",
      "translation": "如果有任何疑问，请联系我们的支持团队。",
      "tipZh": "在 if 从句中通常不写 will；主句可用 will 或祈使句。",
      "tipJa": "未来のことでも if 節は通常現在形を用います。",
      "questions": [
        {
          "prompt": "If the invoice ___ today, we will process it tomorrow.",
          "options": [
            "arrives",
            "will arrive",
            "arrived",
            "arriving"
          ],
          "correct": 0,
          "whyZh": "if 条件从句用一般现在时 arrives。",
          "whyJa": "if 節では現在形 arrives を使います。"
        },
        {
          "prompt": "We will call you if more information ___ needed.",
          "options": [
            "will be",
            "are",
            "is",
            "were"
          ],
          "correct": 2,
          "whyZh": "information 不可数，因此使用 is needed。",
          "whyJa": "information は不可算名詞なので is needed。"
        }
      ]
    },
    {
      "id": "en-07",
      "point": "现在完成时",
      "zh": "过去发生的事与现在相关；区分明确过去时间",
      "ja": "現在とのつながりを示す現在完了形",
      "form": "have/has + past participle",
      "example": "We have already sent the revised quotation.",
      "translation": "我们已经发出了修改后的报价单。",
      "tipZh": "already、yet 常与现在完成时连用；yesterday 指向一般过去时。",
      "tipJa": "already・yet は現在完了と相性が良く、yesterday は過去形を使います。",
      "questions": [
        {
          "prompt": "The supplier has already ___ the delivery date.",
          "options": [
            "confirm",
            "confirms",
            "confirmed",
            "confirming"
          ],
          "correct": 2,
          "whyZh": "has 后用过去分词 confirmed。",
          "whyJa": "has の後ろには過去分詞 confirmed。"
        },
        {
          "prompt": "The client ___ the agreement yesterday.",
          "options": [
            "has signed",
            "signs",
            "signed",
            "signing"
          ],
          "correct": 2,
          "whyZh": "yesterday 是明确过去时间，选择 signed。",
          "whyJa": "yesterday があるので過去形 signed。"
        }
      ]
    },
    {
      "id": "en-08",
      "point": "比较级",
      "zh": "比较双方时使用比较级，注意 than 和 more",
      "ja": "二者比較には比較級を用いる",
      "form": "more efficient than / less expensive than",
      "example": "This process is more efficient than the previous one.",
      "translation": "这个流程比原来的效率更高。",
      "tipZh": "efficient 是多音节形容词，通常用 more efficient。",
      "tipJa": "efficient は more efficient として比較級を作ります。",
      "questions": [
        {
          "prompt": "The updated software is ___ than the older version.",
          "options": [
            "reliable",
            "more reliable",
            "most reliable",
            "reliably"
          ],
          "correct": 1,
          "whyZh": "than 提示比较级，选择 more reliable。",
          "whyJa": "than があるので比較級 more reliable。"
        },
        {
          "prompt": "This option is ___ expensive than the first one.",
          "options": [
            "little",
            "less",
            "least",
            "few"
          ],
          "correct": 1,
          "whyZh": "less expensive 表示更便宜。",
          "whyJa": "less expensive はより安価という意味です。"
        }
      ]
    },
    {
      "id": "en-09",
      "point": "although / despite",
      "zh": "although 后接句子，despite 后接名词或动名词",
      "ja": "although は節、despite は名詞句を続ける",
      "form": "Although it rained ... / Despite the rain ...",
      "example": "Despite the delay, the team finished the project.",
      "translation": "尽管有延误，团队还是完成了项目。",
      "tipZh": "不要写 despite it was late；应写 although it was late 或 despite the delay。",
      "tipJa": "despite の後ろには通常名詞句を置きます。",
      "questions": [
        {
          "prompt": "___ the heavy traffic, she arrived on time.",
          "options": [
            "Although",
            "Despite",
            "Because",
            "Unless"
          ],
          "correct": 1,
          "whyZh": "the heavy traffic 为名词短语，使用 Despite。",
          "whyJa": "the heavy traffic は名詞句なので Despite。"
        },
        {
          "prompt": "___ the shipment was delayed, the customer remained calm.",
          "options": [
            "Despite",
            "In spite of",
            "Although",
            "During"
          ],
          "correct": 2,
          "whyZh": "后面是完整从句，使用 Although。",
          "whyJa": "後ろに節が続くので Although。"
        }
      ]
    },
    {
      "id": "en-10",
      "point": "词性选择",
      "zh": "根据空格所在位置选择名词、形容词或副词",
      "ja": "空欄の文法的位置から品詞を判断する",
      "form": "a successful launch / work successfully",
      "example": "The department successfully completed the audit.",
      "translation": "部门成功完成了审计。",
      "tipZh": "修饰名词用形容词；修饰动词通常用副词。",
      "tipJa": "名詞には形容詞、動詞には副詞が基本です。",
      "questions": [
        {
          "prompt": "We need a ___ explanation of the changes.",
          "options": [
            "clear",
            "clearly",
            "clarity",
            "clearing"
          ],
          "correct": 0,
          "whyZh": "名词 explanation 前需要形容词 clear。",
          "whyJa": "explanation を修飾する形容詞 clear。"
        },
        {
          "prompt": "The staff responded ___ to the customer's request.",
          "options": [
            "prompt",
            "promptness",
            "promptly",
            "prompts"
          ],
          "correct": 2,
          "whyZh": "修饰 responded 这个动词，用副词 promptly。",
          "whyJa": "動詞 responded を修飾するため promptly。"
        }
      ]
    },
    {
      "id": "en-11",
      "point": "情态动词与礼貌请求",
      "zh": "could、would、may 在商务英语中用于更礼貌的请求",
      "ja": "could・would・may による丁寧な依頼",
      "form": "Could you ...? / Would you mind + -ing?",
      "example": "Would you mind sending the updated document?",
      "translation": "能麻烦您发送更新后的文件吗？",
      "tipZh": "Would you mind 后用 -ing；Could you 后接动词原形。",
      "tipJa": "Would you mind の後ろは -ing、Could you の後ろは原形です。",
      "questions": [
        {
          "prompt": "Would you mind ___ the meeting to Thursday?",
          "options": [
            "move",
            "moving",
            "to move",
            "moved"
          ],
          "correct": 1,
          "whyZh": "Would you mind 后接 moving。",
          "whyJa": "Would you mind の後ろは moving。"
        },
        {
          "prompt": "Could you ___ the figures before noon?",
          "options": [
            "checking",
            "checked",
            "check",
            "to check"
          ],
          "correct": 2,
          "whyZh": "Could you 后接动词原形 check。",
          "whyJa": "Could you の後ろには原形 check。"
        }
      ]
    },
    {
      "id": "en-12",
      "point": "分词修饰",
      "zh": "现在分词表示主动，过去分词常表示被动或完成",
      "ja": "現在分詞は能動、過去分詞は受動の意味になりやすい",
      "form": "the employee working here / the report prepared yesterday",
      "example": "Please review the documents attached to this email.",
      "translation": "请查看本邮件所附的文件。",
      "tipZh": "documents 与 attach 为被动关系，所以用 attached。",
      "tipJa": "documents は添付される側なので attached。",
      "questions": [
        {
          "prompt": "The documents ___ yesterday are on the desk.",
          "options": [
            "prepare",
            "preparing",
            "prepared",
            "prepares"
          ],
          "correct": 2,
          "whyZh": "文件是被准备的，用过去分词 prepared。",
          "whyJa": "書類は準備される側なので prepared。"
        },
        {
          "prompt": "The employee ___ at reception can help you.",
          "options": [
            "work",
            "works",
            "working",
            "worked"
          ],
          "correct": 2,
          "whyZh": "员工主动在前台工作，用现在分词 working。",
          "whyJa": "従業員が働いているので working。"
        }
      ]
    }
  ]
}

function studyDay(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 0
  const time = Date.parse(date + 'T00:00:00Z')
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return 0
  return Math.floor(time / 86400000)
}

export function dailyGrammarLesson(date: string, language: GrammarLanguage): GrammarLesson {
  const lessons = GRAMMAR[language]
  return lessons[studyDay(date) % lessons.length]
}
export function previousGrammarLesson(date: string, language: GrammarLanguage): GrammarLesson {
  const lessons = GRAMMAR[language]
  return lessons[(studyDay(date) + lessons.length - 1) % lessons.length]
}
export function grammarLessonInventory() {
  return { ja: GRAMMAR.ja.length, en: GRAMMAR.en.length,
    questions: [...GRAMMAR.ja, ...GRAMMAR.en].reduce((sum, item) => sum + item.questions.length, 0) }
}
