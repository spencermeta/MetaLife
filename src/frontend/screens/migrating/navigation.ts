// SPDX-FileCopyrightText: 2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import {Stream} from 'xstream';
import {Command} from 'cycle-native-navigation';
import {Screens} from '../enums';
import {navOptions as contentNavOpts} from '../content';

export interface Actions {
  continue$: Stream<any>;
}

export default function navigation(actions: Actions): Stream<Command> {
  const goToCentral$ = actions.continue$.mapTo({
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

  return goToCentral$;
}
