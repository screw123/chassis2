import { Meteor } from 'meteor/meteor';
import lodash from 'lodash';

import '../imports/api/auth/CheckAuth.js';

import '../imports/api/DBSchema/acct_journal.js';
import '../imports/api/DBSchema/arap.js';
import '../imports/api/DBSchema/arapHistory.js';
import '../imports/api/DBSchema/business.js';
import '../imports/api/DBSchema/claims.js';
import '../imports/api/DBSchema/claimsHistory.js';
import '../imports/api/DBSchema/COA.js';
import '../imports/api/DBSchema/notification.js';
import '../imports/api/DBSchema/OrgRole.js';
import '../imports/api/DBSchema/project.js';
import '../imports/api/DBSchema/status.js';
import '../imports/api/DBSchema/user.js';

import '../imports/api/acct_module/gl.js';

import '../imports/api/webio/Slack.js';


_ = lodash;

Meteor.startup(() => {
	// code to run on server at startup
	Meteor.publish('allRoles', function (){
  		return Roles.getAllRoles();
	})

});
