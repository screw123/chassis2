import { HTTP } from 'meteor/http';
import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { check, Match } from 'meteor/check';

export const sendSlackMsg = new ValidatedMethod({
	name: 'Slack.sendSlackMsg',
	validate(args) {check(args,
		{
			content: String,
			channel: Match.Maybe(String)
		}
	)},
	applyOptions: {
		//noRetry: true,
	},
	run(args) {
		this.unblock();
		try {
			if (Meteor.isServer) {
				if (!args.channel) {
					const result = HTTP.call("POST", Meteor.settings.private.slackAPIURL, {data: {"text": args.content}});
				} else {
					const result = HTTP.call("POST", Meteor.settings.private.slackAPIURL, {data: {"text": args.content, "channel": args.channel}});
				}
			}
			return true;
		} catch (e) {
			// Got a network error, time-out or HTTP error in the 400 or 500 range..
			return false;
		}
	}
});
