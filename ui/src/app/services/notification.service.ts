/**
 Copyright 2025 Wargaming.Net

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
**/

import {effect, inject, Injectable, signal} from '@angular/core';
import {MatSnackBar} from "@angular/material/snack-bar";


export enum NotificationType {
    SUCCESS,
    ERROR
}

export enum NotificationAction {
    DISMISS,
    RELOAD_PAGE
}

export interface ISnackbarNotification {
    message: string,
    action: NotificationAction,
    type: NotificationType,
}

export interface INotification {
    id: string,
    received: Date,
    message: string,
    type: NotificationType,
    data?: any
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    private readonly snackBar = inject(MatSnackBar);

    private readonly _notification = signal<ISnackbarNotification | null>(null);
    readonly notification = this._notification.asReadonly();


    constructor() {
        effect(() => {
            const notification = this.notification();
            if (!notification) return;

            const actionMessage = (notification.action === NotificationAction.DISMISS) ? 'Dismiss' : 'Reload page';
            const duration = (notification.action === NotificationAction.DISMISS) ? 3000 : 6000;

            const snackBarRef = this.snackBar.open(notification.message, actionMessage, {
                duration,
                verticalPosition: 'top',
                horizontalPosition: 'end'
            });

            snackBarRef.afterDismissed().subscribe(() => {
                if (notification.action === NotificationAction.RELOAD_PAGE) {
                    window.location.reload();
                }
                this._notification.set(null);
            });
        });
    }

    showNotification(message: string, type: NotificationType = NotificationType.SUCCESS, action: NotificationAction = NotificationAction.DISMISS) {
        this._notification.set({message, type, action});
    }
}
