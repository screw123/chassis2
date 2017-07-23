import { Meteor } from 'meteor/meteor';
import lodash from 'lodash';

import '../imports/api/auth/CheckAuth.js';

import '../imports/api/DBSchema/business.js';
import '../imports/api/DBSchema/claims.js';
import '../imports/api/DBSchema/COA.js';
import '../imports/api/DBSchema/project.js';
import '../imports/api/DBSchema/status.js';
import '../imports/api/DBSchema/user.js';

import '../imports/api/webio/Slack.js';


_ = lodash;

Meteor.startup(() => {
	// code to run on server at startup

	Meteor.publish(null, function (){
  		return Meteor.roles.find({})
	})

});
