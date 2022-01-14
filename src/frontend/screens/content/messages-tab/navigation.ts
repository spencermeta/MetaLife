// SPDX-FileCopyrightText: 2018-2021 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {Command} from 'cycle-native-navigation';
import {State} from './model';

export type Actions = {
  closeDrawer$: Stream<null>;
};

export default function navigationCommands(
  state$: Stream<State>,
  actions: Actions,
  other$: Stream<Command>,
): Stream<Command> {
  const closeDrawer$: Stream<Command> = actions.closeDrawer$.map(
    () =>
      ({
        type: 'mergeOptions',
        opts: {
          sideMenu: {
            left: {
              visible: false,
            },
          },
        },
      } as Command),
  );

  return xs.merge(closeDrawer$, other$);
}
