// SPDX-FileCopyrightText: 2018-2021 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {Command} from 'cycle-native-navigation';
import {Screens} from '../../enums';
import {navOptions as contentNavOpts} from '../../content';

export type Actions = {
  process$: Stream<any>;
};

export default function navigation(actions: Actions): Stream<Command> {
  const goToCentral$ = xs.merge(actions.process$).mapTo({
    type: 'setStackRoot',
    layout: {
      sideMenu: {
        left: {
          component: {name: Screens.Drawer},
        },
        center: {
          stack: {
            id: 'mainstack',
            children: [
              {
                component: {
                  name: Screens.Content,
                  options: contentNavOpts,
                },
              },
            ],
          },
        },
      },
    },
  } as Command);

  return xs.merge(goToCentral$);
}
