import { Mongo } from 'meteor/mongo';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const DocHistory = new Mongo.Collection('docHistory');

const Schemas = new SimpleSchema({
	updateBy: {type: String, label: '更新用戶編號', regEx: SimpleSchema.RegEx.Id},
	updateByName: {type: String, label: '更新用戶名稱'},
	updateAt: {type: Date, label: '更新時間' autoValue: function() {
		if (this.isInsert) {
			return new Date();
		} else if (this.isUpsert) {
			return {$setOnInsert: new Date()};
		} else {
			this.unset();
		}
    }},
	updateReason: {type: String, label: '更新原因'},
	updateSnapshot: {type: String, label: '文件源碼'},
	updateSource: {type: String, label: '來源文件'}
});

DocHistory.attachSchema(Schemas);
