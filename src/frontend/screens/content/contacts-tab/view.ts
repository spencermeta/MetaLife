// SPDX-FileCopyrightText: 2018-2021 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {
  ReactElement,
  Fragment,
  PureComponent,
  Component,
  createElement as $,
} from 'react';
import {Platform, View} from 'react-native';
import {h} from '@cycle/react';
import {FloatingAction} from 'react-native-floating-action';
import {IFloatingActionProps as FabProps} from 'react-native-floating-action';
import ActivityTabIcon from '../../../components/tab-buttons/ActivityTabIcon';
import ConnectionsTabIcon from '../../../components/tab-buttons/ConnectionsTabIcon';
import {styles} from './styles';
import {State} from './model';

class TopBarStub extends PureComponent {
  public render() {
    return $(View, {style: styles.topBarStub}, this.props.children);
  }
}

class CurrentTabPage extends PureComponent<{
  currentTab: State['currentTab'];
  fab: FabProps;
  activityTab: ReactElement<any>;
  connectionsTab: ReactElement<any>;
}> {
  public render() {
    const {currentTab, fab, activityTab, connectionsTab} = this.props;
    const shown = styles.pageShown;
    const hidden = styles.pageHidden;

    const fabSection =
      Platform.OS === 'web'
        ? h(View, {style: styles.desktopFabContainer}, [h(FloatingAction, fab)])
        : h(FloatingAction, fab);

    return h(Fragment, [
      h(View, {style: [currentTab === 'activity' ? shown : hidden]}, [
        activityTab,
      ]),
      h(View, {style: [currentTab === 'connections' ? shown : hidden]}, [
        connectionsTab,
        fabSection,
      ]),
    ]);
  }
}

class ContactTabsBar extends Component<State> {
  public shouldComponentUpdate(nextProps: ContactTabsBar['props']) {
    const prevProps = this.props;
    if (nextProps.currentTab !== prevProps.currentTab) return true;

    if (nextProps.numOfActivityUpdates !== prevProps.numOfActivityUpdates) {
      return true;
    }
    if (nextProps.connectionsTab !== prevProps.connectionsTab) {
      return true;
    }
    if (nextProps.initializedSSB !== prevProps.initializedSSB) {
      return true;
    }
    if (nextProps.indexingProgress !== prevProps.indexingProgress) {
      return true;
    }
    if (nextProps.migrationProgress !== prevProps.migrationProgress) {
      return true;
    }
    return false;
  }

  public render() {
    const {currentTab, connectionsTab, initializedSSB} = this.props;

    const status = connectionsTab?.status ?? 'bad';

    return h(View, {style: styles.tabBar}, [
      h(ActivityTabIcon, {
        isSelected: currentTab === 'activity',
        numOfUpdates: this.props.numOfActivityUpdates,
      }),
      h(ConnectionsTabIcon, {
        isSelected: currentTab === 'connections',
        status,
        allowWarningColors: initializedSSB,
      }),
    ]);
  }
}

export default function view(
  state$: Stream<State>,
  fabProps$: Stream<FabProps>,
  activityTab$: Stream<ReactElement<any>>,
  connectionsTab$: Stream<ReactElement<any>>,
) {
  return xs
    .combine(
      state$,
      fabProps$,
      activityTab$.startWith(h(View)),
      connectionsTab$.startWith(h(View)),
    )
    .map(([state, fabProps, activityTab, connectionsTab]) =>
      h(View, {style: styles.root}, [
        // h(RNBridgeDebug),
        Platform.OS === 'web' ? null : h(ContactTabsBar, state),
        h(CurrentTabPage, {
          currentTab: state.currentTab,
          fab: fabProps,
          activityTab,
          connectionsTab,
        }),
      ]),
    )
    .startWith($(TopBarStub));
}
