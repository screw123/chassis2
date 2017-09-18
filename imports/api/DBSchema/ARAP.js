import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random'
import { check } from 'meteor/check'

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const arap = new Mongo.Collection('arap');

export const arapSchema = {
	partyId: {type: String, label: '團體', regEx: SimpleSchema.RegEx.Id},
	partyName: {type: String, label: '團體名稱'},
	journalDate: {type: Date, label: '記錄日期'},

	userId: {type: String, label: '記錄用戶', regEx: SimpleSchema.RegEx.Id},
	userName: {type: String, label: '記錄用戶名稱'},

	organization: {type: String, label: '記錄所屬公司', min: 1},
	projectId: { type: String, label: '所屬項目', optional: true, regEx: SimpleSchema.RegEx.Id },
	projectCode: {type: String, label: '項目名稱', optional: true},
	businessId: { type: String, label: '所屬業務', optional: true, regEx: SimpleSchema.RegEx.Id },
	businessCode: {type: String, label: '業務名稱', optional: true},

	fiscalYear: { type: Number, label: '會計年度' },
	fiscalPeriod: { type: Number, label: '會計期間' },

	journalType: { type: String, label: '記錄類別', min: 3, max: 3},

	COAId: { type: String, label: '記錄科目', regEx: SimpleSchema.RegEx.Id },
	COADesc: { type: String, label: '科目名稱' },
	COAAcctType: { type: String, label: '科目種類', allowedValues: ['BS', 'PL'] },
	COAisDebit: {type: Boolean, label: 'Debit?'},
	COAsubcat1: {type: String, label: '科目分類1', allowedValues: ['BANK', 'AR', 'AP', 'INV', 'LOAN', 'PREPAY-IN', 'PREPAY-OUT', 'FA', 'FA-DEPRE', 'ACCRUAL', 'OTHER-BS', 'GP', 'OPEX', 'OTHER-PL', 'TAX', 'PL-DEPRE'] },
	COAsubcat2: {type: String, label: '科目分類2', optional: true},

	relatedDocType: {type: String, label: '相關文件種類', optional: true},
	relatedDocId: {type: String, label: '相關文件編號', optional: true, regEx: SimpleSchema.RegEx.Id},

	journalDesc: { type: String, label: '個別記錄原因', optional: true },
	EXCurrency: { type: String, label: '貨幣', min: 3, max: 3 },
	EXRate: {type: Number, decimal: true, label: '匯率', min: 0, defaultValue: 1 },
	EXAmt: { type: Number, decimal: true, label: '外幣金額' },
	amt: { type: Number, label: '結算金額', decimal: true, autoValue: function() {
		if ((this.field("EXRate").isSet)&(this.field("EXAmt").isSet)) {
			return this.field("EXRate").value * this.field("EXAmt").value
		}
	}},
	supportDoc: { type: String, label: '上傳檔案', regEx: SimpleSchema.RegEx.Url, optional: true},

	createAt: {type: Date, label: '記錄日期', optional: true, autoValue: function() {
		if (this.isInsert) {
			return new Date();
		} else if (this.isUpsert) {
			return {$setOnInsert: new Date()};
		} else {
			this.unset();
		}
	}},
}
