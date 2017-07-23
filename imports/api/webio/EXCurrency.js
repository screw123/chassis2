import { Mongo } from 'meteor/mongo';
import { HTTP } from 'meteor/http';

import moment from 'moment';

import { sendSlackMsg } from './Slack.js'

export const EX = new Mongo.Collection(null);

export function getEX(d, cur) {
	let a = EX.findOne({date: d.toDate(), EXCurrency: cur});
	console.log(a);
	if (a===undefined) {
		getAndUpdateRate(d);
	}
	a = EX.findOne({date: d.toDate(), EXCurrency: cur});
	console.log(a);
	return EX.findOne({date: d.toDate(), EXCurrency: cur}).fetch().EXRate;
}

const getAndUpdateRate = (d) => {
	HTTP.get('http://apilayer.net/api/historical?access_key=adf9d53867987c590f1d2bce0d69a305&date='+d.format('YYYY-MM-DD')+'&currencies=HKD,CNY,EUR,MOP&format=1', {}, function (e, response) {
		Meteor.call(
			'Slack.sendSlackMsg',
			{content: response.statusCode+'', channel: '@ross'}, (error, response) => {
				if (error) console.warn(error.reason);
			}
		);
		for (k in response.data.quotes) {
			EX.insert({
				date: d.toDate(),
				EXCurrency: k.substr(3,3),
				EXRate: response.data.quotes[k]
			});
		}
		console.log(EX.find({date: d.toDate()}).fetch());
	});
}
