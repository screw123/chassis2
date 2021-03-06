import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { browserHistory, Link } from 'react-router';

import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';

useStrict(true);

import AppBar from 'material-ui/AppBar';
import Drawer from 'material-ui/Drawer';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import Avatar from 'material-ui/Avatar';
import FontIcon from 'material-ui/FontIcon';
import {List, ListItem} from 'material-ui/List';
import Dialog from 'material-ui/Dialog';
import RaisedButton from 'material-ui/RaisedButton';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import { currentTheme, buttonStyle } from '../theme/ThemeSelector.js';

import { changeGroup } from '../../api/DBSchema/user.js';

class Store {
	@observable userGroup = '';
	@observable drawerOpen = false;
	@observable showLogoutDialog = false;
	@action updateUserGroup() { if (Meteor.user()===null) {
		console.log('user is undefined, userGroup will not update')
	} else { this.userGroup = Meteor.user().currentGroup } }
	@action toggleDrawer() {
		if (this.userGroup=='') { this.updateUserGroup(); }
		this.drawerOpen = !this.drawerOpen;
	}
	@action toggleLogoutDialog() { this.showLogoutDialog = !this.showLogoutDialog }
}
const store = new Store()

@observer export default class ToolbarTop extends Component {
	constructor(props) {
		super(props);
		this.handleGoToPage = this.handleGoToPage.bind(this);
		this.handleLogout = this.handleLogout.bind(this);
	}

	handleGoToPage(page) {
		browserHistory.push(page);
		store.toggleDrawer();
	}

	handleLogout() {
		Meteor.logout();
		window.location.reload()

	}

	genLoginCard() {
		if (Meteor.user() == null) {
			console.log('user=null, showing click to login')
			return (
				<Card style={{backgroundColor: currentTheme.palette.accent1Color}} onTouchTap={()=>this.handleGoToPage("/login")}>

					<CardText style={{fontSize: '120%'}}>
						<Avatar style={{backgroundColor: '#000000'}} icon={<FontIcon className="fa fa-user-o" />} />
						{'  ' + '點擊登入'}
					</CardText>
				</Card>
			)
		} else {
			console.log('user=something, generate login card')
			return (
				<div>
					<Card>
						<CardHeader
							title={'  ' + Meteor.user().profile.lastName + ' ' + Meteor.user().profile.firstName}
							subtitle={store.userGroup}
							avatar={<Avatar style={{backgroundColor: '#000000'}}icon={<FontIcon className="fa fa-smile-o" />} />}
							actAsExpander={true}
							showExpandableButton={true}
							style={{backgroundColor: currentTheme.palette.accent1Color}}
						/>
						<CardText expandable={true}>
							<SelectField
								className="default-textField" maxHeight={200}
								floatingLabelText="選擇公司"
								value={store.userGroup}
								onChange={async (e,i,v) => {
									const a = await changeGroup.callPromise({id: Meteor.userId(), newGroup: v});
									store.updateUserGroup();
								}}
							>
								{Object.keys(Meteor.user().roles).map((v)=> <MenuItem value={v} primaryText={v} key={v} />)}
							</SelectField>
							<RaisedButton label="變更密碼" className="button" primary={true} style={buttonStyle} containerElement={<Link to="/resetPassword"/>} onTouchTap={() => store.toggleDrawer()} />
							<RaisedButton label="登出" className="button" primary={true} style={buttonStyle} onTouchTap={() => store.toggleLogoutDialog()} />
							{}
						</CardText>
					</Card>
					<Dialog
						actions={[
							<RaisedButton label="Yes" className="button" primary={true} style={buttonStyle} onTouchTap={this.handleLogout} />,
							<RaisedButton label="No" className="button" primary={true} style={buttonStyle} onTouchTap={() => store.toggleLogoutDialog()} />
						]}
						modal={true}
						open={store.showLogoutDialog}
						onRequestClose={() => store.toggleLogoutDialog()}
					>
						是否確定登出?
					</Dialog>
				</div>
			);
		}
	}

	render() { return (
		<MuiThemeProvider muiTheme={this.props.muiTheme}>
			<div>
				<AppBar
					title={Meteor.settings.public.appName}
					iconClassNameRight="muidocs-icon-navigation-expand-more"
					onLeftIconButtonTouchTap={() => store.toggleDrawer()}
				/>
				<Drawer docked={false} open={store.drawerOpen} onRequestChange={() => store.toggleDrawer()}>
					{this.genLoginCard()}
					<List>
						<ListItem onTouchTap={() => this.handleGoToPage("/dashboard")} primaryText="Dashboard" />
						{Roles.userIsInRole(Meteor.userId(), 'admin', "SYSTEM") && <ListItem onTouchTap={() => this.handleGoToPage("/admin")} primaryText="Admin" />}
						<ListItem primaryText="費用報銷" primaryTogglesNestedList={true} nestedItems={[
							<ListItem onTouchTap={() => this.handleGoToPage("/claims/item/new")} primaryText="新增報銷" key={"menu_101"} />,
							<ListItem onTouchTap={() => this.handleGoToPage("/claims/list/MyClaims")} primaryText="我的報銷" key={"menu_102"} />,
							<ListItem onTouchTap={() => this.handleGoToPage("/claims/list/approve")} primaryText="報銷批核" key={"menu_103"} />,
							<ListItem onTouchTap={() => this.handleGoToPage("/claims/list/onHold")} primaryText="報銷保留" key={"menu_104"} />,
							<ListItem onTouchTap={() => this.handleGoToPage("/claims/list/listAll")} primaryText="所有報銷" key={"menu_105"} />
						]}/>

					</List>

				</Drawer>
			</div>
		</MuiThemeProvider>
	)}
}
