import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import { Session } from 'meteor/session';
import lodash from 'lodash';
_ = lodash;

import { renderRoutes } from '../imports/routes/routes.js'

import { sendSlackMsg } from '../imports/api/webio/Slack.js';

import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();



Meteor.startup(() => {
	Meteor.subscribe('user.profile');
	render(renderRoutes(), document.getElementById('main-container'));
	$(window).resize( () => {
		if (Session.get("windowWidth") != $(window).width()) { Session.set("windowWidth", $(window).width()) }
		if (Session.get("windowHeight") != $(window).height()) { Session.set("windowHeight", $(window).height()) }
	});
});
