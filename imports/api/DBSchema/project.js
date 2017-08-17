import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin';

const Project = new Mongo.Collection('project');

export const ProjectSchema = {
	code: {type: String, unique: true, min: 3, max: 12, label: '業務編號'},
	desc: {type: String, label: '業務內容'},
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
}

export const ProjectView = {
	_id: 'sysID',
	code: 'text',
  	desc: 'text',
	isActive: 'boolean',
	createAt: 'date',
	inactiveAt: 'date',
};

const publishSpec = [
	{ 'name': 'project.ALL', 'filter': {}}
];

Project.attachSchema(new SimpleSchema(ProjectSchema));

export const newProject = new ValidatedMethod({
	name: 'Project.newProject',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a = Project.insert(args);
				return Project.findOne({_id: a}, {fields: {'code': 1}}).code
			}
			catch(err) { throw new Meteor.Error('insert-failed', err.message) }
		}
	}
});

export const updateProject = new ValidatedMethod({
	name: 'Project.updateProject',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({filter, args}) {
		if (Meteor.isServer) {
			try {
				const a = Project.update(filter, {$set: args});
				return '更新了'+a+'張文件';
			}
			catch(err) { throw new Meteor.Error('update-failed', err.message)}
		}
	}
});

export const deleteProject = new ValidatedMethod({
	name: 'Project.deleteProject',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkRoles: {
		roles: ['admin'],
		group: 'SYSTEM',
		rolesError: { error: 'accessDenied', message: '用戶權限不足'}
	},
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run(args) {
		if (Meteor.isServer) {
			try {
				const a= Project.remove(args);
				return '移除了'+a+'張文件';
			 }
			catch(err) { throw new Meteor.Error('delete-failed', err.message) }
		}
	}
});

export const downloadProject = new ValidatedMethod({
	name: 'Project.downloadProject',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Project.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).fetch() }
			catch(err) { throw new Meteor.Error('download-failed', err.message) }
		}
	}
});

export const qtyProject = new ValidatedMethod({
	name: 'Project.qtyProject',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: { error: 'notLoggedIn', message: '用戶未有登入'},
	validate() {},
	run({query, filter}) {
		if (Meteor.isServer) {
			try { return Project.find(Object.assign({}, publishSpec.find((i) => { return i.name===query }).filter, filter)).count() }
			catch(err) { throw new Meteor.Error('qty-failed', err.message) }
		}
	}
});

if (Meteor.isServer) {
	publishSpec.forEach((spec) => {
		Meteor.publish(spec.name, function(args) {
			let lim = 65535
			if (args.limit === undefined) { }
			else { lim = (args.limit > 65535) ? 65535 : args.limit }
			const f = Object.assign({}, spec.filter, args.filter);
			return Project.find(f, { sort: args.sort, limit: lim } );
		});
	});

	Meteor.publish('project.getProject', function(docId) {
		const d_cursor = Project.find({_id: docId});
		if (Roles.userIsInRole(this.userId, 'admin', 'SYSTEM')) { return d_cursor }
		else { throw new Meteor.Error('accessDenied', '用戶權限不足 @ project.getProject, requester: '+this.userId) }
	});
}

export const projectList = new ValidatedMethod({
	name: 'project.list',
	mixins:  [LoggedInMixin, CallPromiseMixin],
	checkLoggedInError: {
		error: 'notLoggedIn',
		message: '用戶未有登入'
	},
	validate() { },
	run() {
		if (Meteor.isServer) {
			try { return Project.find({isActive: true}, {fields: {"code": 1}}).fetch() }
			catch(err) { throw new Meteor.Error('list-fetch-failed', err.message) }
		}
	}
});

export default Project;
