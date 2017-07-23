import { Mongo } from 'meteor/mongo';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const CoA = new Mongo.Collection('CoA');

const Schemas = new SimpleSchema({
	code: {type: Number, unique: true, label: '科目編號'},
	desc: {type: String, label: '內容'},
	acctType: {type: String, label: '科目屬性', allowedValues: ['BS', 'PL']},
	isDebit: {type: Boolean, label: '是否Debit'},
	subcat1: {type: String, label: '科目分類1', allowedValues: ['BANK', 'AR', 'AP', 'INV', 'LOAN', 'PREPAY-IN', 'PREPAY-OUT', 'FA', 'FA-DEPRE', 'ACCRUAL', 'OTHER-BS', 'GP', 'OPEX', 'OTHER-PL', 'TAX', 'PL-DEPRE'] },
	subcat2: {type: String, label: '科目分類2'},
	isActive: {type: Boolean, label: '使用中', defaultValue: true },
	createAt: {type: Date, label: '創建日期', autoValue: function() {
		const isActive = this.field('isActive');
		if (this.isInsert || this.isUpsert || (isActive.isSet & (isActive.value == true) )) {
			return new Date();
		} else {
			this.unset();
		}
    }},
	inactiveAt: {type: Date, label: '停用日期'}
})

CoA.attachSchema(Schemas);

if (Meteor.isServer) {
	Meteor.publish('CoA.ALL', function tasksPublication() {
		return CoA.find();
	});
}

export const CoAList = new ValidatedMethod({
	name: 'CoA.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try {
				const a= CoA.find({isActive: true}, {fields: {"code": 1, "desc": 1}}).fetch();
				return a.map((v) => {return {_id: v._id, name: v.code + ' - ' + v.desc }});
			}
			catch(err) { return err }
		}
	}
});

export default CoA;
