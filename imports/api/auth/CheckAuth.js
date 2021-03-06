import React, { Component } from 'react';
import { Promise } from 'meteor/promise';
import { browserHistory } from 'react-router';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

const getCurrentUser = new ValidatedMethod({
	name: 'getCurrentUser',
	mixins:  [CallPromiseMixin],
	validate() {},
	run() {
		if (Meteor.isServer) { return Meteor.user() }
	}
});

export const checkAuth = (roles) => {
	return new Promise(async (resolve, reject) => {
		try {
			const uid = Meteor.userId();
			const u = await getCurrentUser.callPromise();
			if (!uid) { return reject("請先登入.") }
			if (!u.isActive) { return reject("用戶已停用.") }
			_.each(roles, function(v) {
				if (!Roles.userIsInRole(u, v.role, v.group)) { return reject("用戶沒有相關權限.") }
			})
			return resolve(true);
		}
		catch(err) { return reject(err) }
	});
}
