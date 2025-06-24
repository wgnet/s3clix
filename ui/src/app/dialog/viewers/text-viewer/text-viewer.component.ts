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

import {Component, computed, Input, OnDestroy, OnInit, signal} from '@angular/core';
import {finalize, Subject, takeUntil} from "rxjs";
import {DataServiceService} from "../../../services/data-service.service";
import {NotificationService, NotificationType} from "../../../services/notification.service";
import {environment} from "../../../../environments/environment";
import {ThemeService} from "../../../services/theme.service";

export function getModeByExtension(ext: string): string {
    const modes = environment.codeMirrorModes as Record<string, string>;
    return modes[ext.toLowerCase()] || 'null';
}

export enum codeMirrorTheme {
    dark = 'material',
    light = 'neo',
}

@Component({
    selector: 'app-text-viewer',
    templateUrl: './text-viewer.component.html',
    styleUrls: ['./text-viewer.component.scss'],
    standalone: false
})
export class TextViewerComponent implements OnInit, OnDestroy {

    isLoading = signal<boolean>(true);
    ext = signal<string>('');
    theme = signal<codeMirrorTheme>(codeMirrorTheme.light);
    content = signal<string>('');

    destroy$ = new Subject<boolean>();

    readonlyOptions = computed(() => ({
        mode: getModeByExtension(this.ext()),
        lineNumbers: false,
        lineWrapping: true,
        readOnly: true,
        cursorHeight: 0,
        theme: this.theme()
    }));

    @Input('src')
    set srcSetter(src: string) {
        if (src) {
            this.loadFile(src);
        } else {
            this.content.set('');
        }
    }

    @Input('ext')
    set extSetter(ext: string) {
        this.ext.set(ext);
    }


    constructor(private dataService: DataServiceService,
                private notificationService: NotificationService,
                private themeService: ThemeService) {
    }

    ngOnInit() {
        const theme = this.themeService.mode;
        if (theme == 'dark') {
            this.theme.set(codeMirrorTheme.dark);
        } else
            this.theme.set(codeMirrorTheme.light);

    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
    }

    loadFile(src: string) {
        this.isLoading.set(true);
        this.content.set('');
        this.dataService.getTextFile(src).pipe(takeUntil(this.destroy$),
            finalize(() => this.isLoading.set(false)))
            .subscribe({
                    next: ((response: string) => {
                        this.content.set(response);
                    }),
                    error: () => {
                        this.notificationService.showNotification(`Something went wrong, while loading file...😢`, NotificationType.ERROR);
                        this.content.set('Something went wrong, while loading file...😢');
                    }
                }
            );
    }

}
