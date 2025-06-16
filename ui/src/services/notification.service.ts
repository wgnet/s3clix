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
import {Injectable} from '@angular/core';
import {Subject} from "rxjs";


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

  private notificationStream = new Subject<ISnackbarNotification>()


  constructor() {
  }

  private addNotificationInQueue(message: string, type: NotificationType, onDismiss: NotificationAction) {
    this.notificationStream.next({
      message: message,
      action: onDismiss,
      type: type
    });
  }

  showNotification(message: string, type: NotificationType = NotificationType.SUCCESS, onDismiss: NotificationAction = NotificationAction.DISMISS) {
    this.addNotificationInQueue(message, type, onDismiss);
  }

  getStream(): Subject<ISnackbarNotification> {
    return this.notificationStream;
  }
}
