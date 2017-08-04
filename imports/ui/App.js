import React, { Component } from 'react';
import { HTTP } from 'meteor/http';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';

import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';

useStrict(true);

import { sendSlackMsg } from '../api/webio/Slack.js';

import { currentTheme, buttonStyle } from './theme/ThemeSelector.js'
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import Paper from 'material-ui/Paper';
import Dialog from 'material-ui/Dialog';
import Snackbar from 'material-ui/Snackbar';

import ToolBarTop from './toolbar/ToolBarTop.js'

class CommonDialog {
	@observable msg = '';
	@observable show= false;
	@action setShowCommonDialog(b) { this.show = b }
	@action setCommonDialogMsg(m) {
		console.log('CommonDialog.setCommonDialogMsg', m)
		this.msg = m;
	}
}

class CommonSnackBar {
	@observable msg = '';
	@observable show= false;
	@observable action = () => { console.log() }
	@observable actionLabel = '';
	@action setShowSnackBar(b) { this.show = b }
	@action setSnackBarMsg(m) { this.msg = m }
	@action setSnackBarAction(a, label) {
		this.action = a;
		this.actionLabel = label
	}
}

const commonSnackBar = new CommonSnackBar();
const commonDialog = new CommonDialog();

@observer export default class App extends Component {
	constructor(props) {
		super();
		this.handleClick = this.handleClick.bind(this);
	}

	conponentWillMount() {

	}

	render() {
		const muiTheme = getMuiTheme(currentTheme);

		const style = {
		};
		return (
			<MuiThemeProvider muiTheme={muiTheme}>
				<div style={{height: '100%'}}>
					<header>
						<ToolBarTop muiTheme={muiTheme} />
					</header>
					<Dialog
						actions={[
							<RaisedButton label="OK" className="button" primary={true} onTouchTap={() => commonDialog.setShowCommonDialog(false)} />
						]}
						modal={true}
						open={commonDialog.show}
						onRequestClose={() => commonDialog.setShowCommonDialog(false)}
					>
						{commonDialog.msg}
					</Dialog>
					<Snackbar
						open={commonSnackBar.show}
						message={commonSnackBar.msg}
						action={commonSnackBar.actionLabel}
						autoHideDuration={10000}
						onActionTouchTap={ commonSnackBar.action }
						onRequestClose={() => commonSnackBar.setShowSnackBar(false)}
					/>
					<Paper className='main-page' zDepth={1} rounded={false} >
						{React.cloneElement(this.props.children, {
							setShowCommonDialog: commonDialog.setShowCommonDialog.bind(commonDialog),
							setCommonDialogMsg: commonDialog.setCommonDialogMsg.bind(commonDialog),
							setShowSnackBar: commonSnackBar.setShowSnackBar.bind(commonSnackBar),
							setSnackBarMsg: commonSnackBar.setSnackBarMsg.bind(commonSnackBar),
							setSnackBarAction: commonSnackBar.setSnackBarAction.bind(commonSnackBar)
						})}
						{/* <TestButton onClick={this.handleClick}/> */}
					</Paper>

					{/* <footer>
						<ToolbarBottom muiTheme={muiTheme} />
					</footer> */}
				</div>
			</MuiThemeProvider>
		);
	}

	handleClick() {
		sendSlackMsg.call({content: "aaa"});
	}
}

class TestButton extends Component {
	render() {
		return <RaisedButton label="Test Send" primary={true} onClick={this.props.onClick}/>
	}
}
