/** Original 2-turn listening conversations for daily and workplace situations.
 * Spoken content is played by the existing browser TTS; no remote audio or AI.
 * Distinguish authored educational items from licensed Tatoeba examples.
 */
export type ListeningLanguage = 'ja' | 'en'
export type ListeningCategory = '日常句子' | '职场语言'
export type ListeningTurn = { speaker: string; text: string; zh: string }
export type ListeningScene = {
  id: string
  language: ListeningLanguage
  category: ListeningCategory
  turns: ListeningTurn[]
  questionZh: string
  options: string[]
  correct: number
  focusZh: string
  whyZh: string
  whyJa: string
}
const SCENES: ListeningScene[] = [
  {
    "id": "ja-d1",
    "language": "ja",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "電車が遅れているので、駅に着くのが十分ほど遅れそうです。",
        "zh": "电车晚点，我到车站可能会晚十分钟左右。"
      },
      {
        "speaker": "B",
        "text": "分かりました。改札の前で待っていますね。",
        "zh": "知道了，我会在检票口前等你。"
      }
    ],
    "questionZh": "第二个人会在哪里等？",
    "options": [
      "咖啡馆里",
      "检票口前",
      "站台上",
      "停车场"
    ],
    "correct": 1,
    "focusZh": "～そうです（推测）／待っています",
    "whyZh": "对方明确说「改札の前」。",
    "whyJa": "「改札の前で待っています」と言っています。"
  },
  {
    "id": "ja-d2",
    "language": "ja",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "今度の日曜日、引っ越しの手伝いをお願いできる？",
        "zh": "下周日能请你帮忙搬家吗？"
      },
      {
        "speaker": "B",
        "text": "午後なら空いているけど、午前中は用事があるんだ。",
        "zh": "下午有空，不过上午有事。"
      }
    ],
    "questionZh": "第二个人什么时候能帮忙？",
    "options": [
      "周日上午",
      "周日中午前",
      "周日下午",
      "整天都没空"
    ],
    "correct": 2,
    "focusZh": "～なら（限定条件）",
    "whyZh": "「午後なら空いている」表示下午有空。",
    "whyJa": "「午後なら空いている」と条件を示しています。"
  },
  {
    "id": "ja-d3",
    "language": "ja",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "この店は現金しか使えないみたい。",
        "zh": "这家店好像只能用现金。"
      },
      {
        "speaker": "B",
        "text": "じゃあ、近くのATMで下ろしてから戻ろう。",
        "zh": "那先去附近 ATM 取钱再回来吧。"
      }
    ],
    "questionZh": "他们接下来会做什么？",
    "options": [
      "换一家店",
      "使用信用卡",
      "去附近 ATM 取钱",
      "叫店员"
    ],
    "correct": 2,
    "focusZh": "～しか～ない（只有）",
    "whyZh": "只能用现金，因此决定先取钱。",
    "whyJa": "現金しか使えないので、ATM に行くことにしました。"
  },
  {
    "id": "ja-d4",
    "language": "ja",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "明日は雨が降るらしいよ。傘を持っていったほうがいいかも。",
        "zh": "听说明天会下雨，可能最好带伞。"
      },
      {
        "speaker": "B",
        "text": "教えてくれてありがとう。折りたたみ傘を持っていくね。",
        "zh": "谢谢提醒，我会带折叠伞。"
      }
    ],
    "questionZh": "第二个人决定带什么？",
    "options": [
      "雨衣",
      "长靴",
      "折叠伞",
      "帽子"
    ],
    "correct": 2,
    "focusZh": "～たほうがいい（建议）",
    "whyZh": "明确答应带「折りたたみ傘」。",
    "whyJa": "「折りたたみ傘を持っていく」と答えています。"
  },
  {
    "id": "ja-d5",
    "language": "ja",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "荷物の配達時間を変更したいんですが、明日の夜は空いていますか。",
        "zh": "想修改快递配送时间，明晚可以吗？"
      },
      {
        "speaker": "B",
        "text": "はい、十八時から二十時でしたら指定できます。",
        "zh": "可以指定十八点到二十点。"
      }
    ],
    "questionZh": "可以选择哪个配送时间段？",
    "options": [
      "10:00～12:00",
      "13:00～15:00",
      "18:00～20:00",
      "21:00～23:00"
    ],
    "correct": 2,
    "focusZh": "～でしたら（礼貌条件）",
    "whyZh": "客服提供十八点至二十点。",
    "whyJa": "「十八時から二十時」と案内しています。"
  },
  {
    "id": "ja-d6",
    "language": "ja",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "予約しているんですが、少し遅れそうなのでお電話しました。",
        "zh": "我有预约，不过可能会迟到，所以打电话说明。"
      },
      {
        "speaker": "B",
        "text": "ご連絡ありがとうございます。お名前と到着予定時刻を伺ってもよろしいですか。",
        "zh": "谢谢通知，可以请问您的姓名和预计到达时间吗？"
      }
    ],
    "questionZh": "接待人员接下来要确认什么？",
    "options": [
      "支付方式",
      "姓名和到达时间",
      "点餐内容",
      "联系电话"
    ],
    "correct": 1,
    "focusZh": "～伺ってもよろしいですか（礼貌询问）",
    "whyZh": "对方明确询问名字和预计时间。",
    "whyJa": "名前と到着予定時刻を伺っています。"
  },
  {
    "id": "ja-w1",
    "language": "ja",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "本番に反映する前に、検証環境でもう一度確認していただけますか。",
        "zh": "部署到生产前，能否再在验证环境检查一次？"
      },
      {
        "speaker": "B",
        "text": "承知しました。テストが終わり次第、結果をご報告します。",
        "zh": "好的，测试结束后立即报告结果。"
      }
    ],
    "questionZh": "第二个人什么时候报告结果？",
    "options": [
      "发布以后",
      "测试结束后",
      "下个月",
      "下班前"
    ],
    "correct": 1,
    "focusZh": "～次第（完成后立即）",
    "whyZh": "「テストが終わり次第」表示测试完立即报告。",
    "whyJa": "「テストが終わり次第」と言っています。"
  },
  {
    "id": "ja-w2",
    "language": "ja",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "不具合の原因は分かったんですが、修正に少し時間がかかりそうです。",
        "zh": "已经找到故障原因，不过修复可能要花些时间。"
      },
      {
        "speaker": "B",
        "text": "では、まず影響範囲と対応の見込みを共有してください。",
        "zh": "那么请先共享影响范围和预计处理进度。"
      }
    ],
    "questionZh": "经理要求先做什么？",
    "options": [
      "立即删除代码",
      "共享影响范围和预计进度",
      "通知客户已修复",
      "取消所有测试"
    ],
    "correct": 1,
    "focusZh": "～見込み（预计）",
    "whyZh": "重点是先报告影响范围与处理预计。",
    "whyJa": "まず影響範囲と対応の見込みを共有するよう求めています。"
  },
  {
    "id": "ja-w3",
    "language": "ja",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "資料は木曜日までにいただけると助かります。",
        "zh": "如果能在周四前收到资料就太好了。"
      },
      {
        "speaker": "B",
        "text": "確認して、難しそうでしたら明日の午前中にご連絡します。",
        "zh": "我先确认，如果有困难会在明天上午联系您。"
      }
    ],
    "questionZh": "如果赶不上，对方会什么时候联系？",
    "options": [
      "今天深夜",
      "明天上午",
      "周四晚上",
      "下周一"
    ],
    "correct": 1,
    "focusZh": "～ていただけると助かります（委婉请求）",
    "whyZh": "如有困难，承诺明天上午联系。",
    "whyJa": "難しければ「明日の午前中」に連絡します。"
  },
  {
    "id": "ja-w4",
    "language": "ja",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "議事録を作成したので、会議の参加者に共有してもよろしいでしょうか。",
        "zh": "会议纪要已经整理好了，可以发给参会者吗？"
      },
      {
        "speaker": "B",
        "text": "はい、共有する前に、決定事項の部分だけ確認させてください。",
        "zh": "可以，但在共享前让我先确认决定事项部分。"
      }
    ],
    "questionZh": "共享前需要做什么？",
    "options": [
      "删掉全部记录",
      "打印纸质版",
      "确认决定事项",
      "再次开会"
    ],
    "correct": 2,
    "focusZh": "～させてください（请求允许）",
    "whyZh": "对方要求先检查决定事项。",
    "whyJa": "共有する前に決定事項を確認したいと言っています。"
  },
  {
    "id": "ja-w5",
    "language": "ja",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "お客様から追加の要望が届きました。優先度をどうしましょうか。",
        "zh": "客户新增了需求，该怎么确定优先级？"
      },
      {
        "speaker": "B",
        "text": "納期への影響を確認したうえで、優先順位を決めましょう。",
        "zh": "先确认对交付日期的影响，再决定优先顺序吧。"
      }
    ],
    "questionZh": "优先级决定之前要先确认什么？",
    "options": [
      "报价单字体",
      "交付日期的影响",
      "团队人数",
      "会议室大小"
    ],
    "correct": 1,
    "focusZh": "～たうえで（在……之后）",
    "whyZh": "先评估对纳期的影响。",
    "whyJa": "納期への影響を確認した上で決めます。"
  },
  {
    "id": "ja-w6",
    "language": "ja",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "この資料には個人情報が含まれています。チャットに貼り付けても大丈夫ですか。",
        "zh": "这份资料包含个人信息，可以直接贴到聊天里吗？"
      },
      {
        "speaker": "B",
        "text": "いいえ、指定された安全な共有方法を使ってください。",
        "zh": "不行，请使用指定的安全共享方式。"
      }
    ],
    "questionZh": "第二个人建议如何分享资料？",
    "options": [
      "直接贴到公开聊天",
      "通过指定的安全方式",
      "上传社交平台",
      "发到所有群"
    ],
    "correct": 1,
    "focusZh": "～含まれています（包含）",
    "whyZh": "个人信息应使用指定的安全方式分享。",
    "whyJa": "指定された安全な共有方法を使うよう案内しています。"
  },
  {
    "id": "en-d1",
    "language": "en",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "The bus to the museum now leaves from stop four, not stop two.",
        "zh": "去博物馆的公交车现在从四号站台出发，不是二号。"
      },
      {
        "speaker": "B",
        "text": "Thanks for letting me know. I'll head to stop four.",
        "zh": "谢谢告诉我，我去四号站台。"
      }
    ],
    "questionZh": "乘客应该去哪个站台？",
    "options": [
      "1 号",
      "2 号",
      "3 号",
      "4 号"
    ],
    "correct": 3,
    "focusZh": "now ... not ...（更改的信息）",
    "whyZh": "公交站台改成了四号。",
    "whyJa": "The speaker says the bus leaves from stop four."
  },
  {
    "id": "en-d2",
    "language": "en",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "I'd like to exchange this jacket, but I left the receipt at home.",
        "zh": "我想换这件夹克，但收据忘在家里了。"
      },
      {
        "speaker": "B",
        "text": "That's fine. Please bring the receipt when you come back.",
        "zh": "没关系，下次来时请带收据。"
      }
    ],
    "questionZh": "下次需要带什么？",
    "options": [
      "身份证",
      "收据",
      "现金",
      "新衣服"
    ],
    "correct": 1,
    "focusZh": "exchange（换货）／receipt（收据）",
    "whyZh": "店员要求下次带收据。",
    "whyJa": "The clerk asks the customer to bring the receipt."
  },
  {
    "id": "en-d3",
    "language": "en",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "I can't make my appointment on Tuesday. Is Thursday afternoon available?",
        "zh": "周二的预约我去不了，周四下午有空位吗？"
      },
      {
        "speaker": "B",
        "text": "Yes, we have an opening at three thirty.",
        "zh": "有，三点半还有空位。"
      }
    ],
    "questionZh": "新预约是周四几点？",
    "options": [
      "1:30",
      "2:00",
      "3:30",
      "4:30"
    ],
    "correct": 2,
    "focusZh": "make an appointment（赴约／预约）",
    "whyZh": "周四下午三点半有空位。",
    "whyJa": "The opening is at three thirty."
  },
  {
    "id": "en-d4",
    "language": "en",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "Your package is ready for pickup at the service counter.",
        "zh": "你的包裹可以到服务柜台领取了。"
      },
      {
        "speaker": "B",
        "text": "Great. Is the counter open until eight tonight?",
        "zh": "太好了，柜台今晚开到八点吗？"
      }
    ],
    "questionZh": "包裹在哪里领取？",
    "options": [
      "自助储物柜",
      "服务柜台",
      "停车场",
      "收银台"
    ],
    "correct": 1,
    "focusZh": "ready for pickup（可领取）",
    "whyZh": "包裹在服务柜台领取。",
    "whyJa": "The package is at the service counter."
  },
  {
    "id": "en-d5",
    "language": "en",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "The laundry room closes at ten, so we should start the wash now.",
        "zh": "洗衣房十点关门，我们现在就开始洗吧。"
      },
      {
        "speaker": "B",
        "text": "Good idea. It usually takes about forty minutes.",
        "zh": "好主意，一般需要大约四十分钟。"
      }
    ],
    "questionZh": "洗衣通常需要多长时间？",
    "options": [
      "20 分钟",
      "30 分钟",
      "40 分钟",
      "60 分钟"
    ],
    "correct": 2,
    "focusZh": "It takes ...（花费时间）",
    "whyZh": "对话说大约四十分钟。",
    "whyJa": "The wash usually takes about forty minutes."
  },
  {
    "id": "en-d6",
    "language": "en",
    "category": "日常句子",
    "turns": [
      {
        "speaker": "A",
        "text": "Would you like to split the bill or pay together?",
        "zh": "你们要分开结账还是一起结账？"
      },
      {
        "speaker": "B",
        "text": "Let's split it. I'll pay for my pasta and drink.",
        "zh": "分开吧，我付自己的意面和饮料。"
      }
    ],
    "questionZh": "他们决定怎样付款？",
    "options": [
      "一起付",
      "分开付",
      "使用优惠券",
      "改天付"
    ],
    "correct": 1,
    "focusZh": "split the bill（分开结账）",
    "whyZh": "选择了 split it。",
    "whyJa": "The customer says, 'Let's split it.'"
  },
  {
    "id": "en-w1",
    "language": "en",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "The shipment is delayed by two days due to a supplier issue.",
        "zh": "由于供应商问题，货物延误两天。"
      },
      {
        "speaker": "B",
        "text": "Please notify the client by noon and suggest a new delivery date.",
        "zh": "请在中午前通知客户，并提出新的交货日期。"
      }
    ],
    "questionZh": "通知客户的截止时间是？",
    "options": [
      "上午十点",
      "中午前",
      "下午五点",
      "明天"
    ],
    "correct": 1,
    "focusZh": "due to（由于）／notify（通知）",
    "whyZh": "要求在中午前通知客户。",
    "whyJa": "The deadline is by noon."
  },
  {
    "id": "en-w2",
    "language": "en",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "Could you revise the proposal based on yesterday's feedback?",
        "zh": "能否根据昨天的反馈修改提案？"
      },
      {
        "speaker": "B",
        "text": "Certainly. I'll send the updated version by Thursday.",
        "zh": "当然，我会在周四前发送更新版。"
      }
    ],
    "questionZh": "更新后的提案什么时候发送？",
    "options": [
      "周一",
      "周二",
      "周四",
      "周五"
    ],
    "correct": 2,
    "focusZh": "revise（修改）／based on（根据）",
    "whyZh": "更新版将在周四前发送。",
    "whyJa": "The updated version will be sent by Thursday."
  },
  {
    "id": "en-w3",
    "language": "en",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "The conference room is unavailable at two, so I moved the meeting to three.",
        "zh": "会议室两点不能用，所以我把会议改到三点。"
      },
      {
        "speaker": "B",
        "text": "Understood. I'll update the calendar invitation.",
        "zh": "明白，我来更新日历邀请。"
      }
    ],
    "questionZh": "新的会议时间是？",
    "options": [
      "13:00",
      "14:00",
      "15:00",
      "16:00"
    ],
    "correct": 2,
    "focusZh": "unavailable（不可用）／move a meeting（改会议时间）",
    "whyZh": "会议从两点改到三点。",
    "whyJa": "The meeting was moved to three o'clock."
  },
  {
    "id": "en-w4",
    "language": "en",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "Finance found an error in the invoice total.",
        "zh": "财务发现发票总额有误。"
      },
      {
        "speaker": "B",
        "text": "Please correct the amount and send the revised invoice for approval.",
        "zh": "请纠正金额，把修改后的发票送去审批。"
      }
    ],
    "questionZh": "下一步需要处理什么？",
    "options": [
      "取消采购",
      "修改发票金额并送审",
      "换供应商",
      "安排培训"
    ],
    "correct": 1,
    "focusZh": "invoice（发票）／approval（审批）",
    "whyZh": "应先改金额，再把修正版送审批。",
    "whyJa": "The revised invoice must be sent for approval."
  },
  {
    "id": "en-w5",
    "language": "en",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "My laptop won't connect to the office network.",
        "zh": "我的笔记本连不上办公室网络。"
      },
      {
        "speaker": "B",
        "text": "Please contact IT support. They can provide a temporary device if needed.",
        "zh": "请联系 IT 支持，需要的话他们可以提供临时设备。"
      }
    ],
    "questionZh": "建议联系哪个部门？",
    "options": [
      "财务",
      "销售",
      "IT 支持",
      "人事"
    ],
    "correct": 2,
    "focusZh": "temporary device（临时设备）",
    "whyZh": "推荐联系 IT 支持团队。",
    "whyJa": "The speaker recommends contacting IT support."
  },
  {
    "id": "en-w6",
    "language": "en",
    "category": "职场语言",
    "turns": [
      {
        "speaker": "A",
        "text": "The contract needs one final review before we sign it.",
        "zh": "签约前合同还需要最后审核一次。"
      },
      {
        "speaker": "B",
        "text": "I'll check the terms and send my comments by Monday morning.",
        "zh": "我会核对条款，并在周一上午前发意见。"
      }
    ],
    "questionZh": "审核意见什么时候提交？",
    "options": [
      "周日晚",
      "周一上午前",
      "周二下午",
      "周五"
    ],
    "correct": 1,
    "focusZh": "terms（条款）／final review（最终审核）",
    "whyZh": "承诺周一上午前发送意见。",
    "whyJa": "Comments are due by Monday morning."
  }
]

function calendarDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 0
  const time = Date.parse(value + 'T00:00:00Z')
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return 0
  return Math.floor(time / 86400000)
}
export function dailyListeningScenes(date: string, language: ListeningLanguage): ListeningScene[] {
  const today = calendarDay(date)
  return (['日常句子','职场语言'] as const).map(category => {
    const pool = SCENES.filter(scene => scene.language === language && scene.category === category)
    return pool[today % pool.length]
  })
}
export function listeningInventory() {
  return {
    jaDaily: SCENES.filter(s => s.language === 'ja' && s.category === '日常句子').length,
    jaWork: SCENES.filter(s => s.language === 'ja' && s.category === '职场语言').length,
    enDaily: SCENES.filter(s => s.language === 'en' && s.category === '日常句子').length,
    enWork: SCENES.filter(s => s.language === 'en' && s.category === '职场语言').length,
  }
}
