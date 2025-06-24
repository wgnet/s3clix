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

import {Inject, Injectable, InjectionToken, OnDestroy, Optional} from '@angular/core';
import {Subject} from "rxjs";
import {LocalStorageService} from "./local-storage.service";

export const DARK_THEME_CLASS = new InjectionToken<string>('Class to apply, when fixed dark mode is required', {
    providedIn: 'root',
    factory: () => 'dark-mode'
});
export const LIGHT_THEME_CLASS = new InjectionToken<string>('Class to apply, when fixed light mode is required', {
    providedIn: 'root',
    factory: () => 'light-mode'
});
export const SYSTEM_THEME_CLASS = new InjectionToken<string>('Class to apply, when mode is required', {
    providedIn: 'root',
    factory: () => 'system-mode'
});

export enum UITheme {
    DARK = "dark",
    LIGHT = "light",
    SYSTEM = "system"
}

const LS_KEY = 'theme';

@Injectable({
    providedIn: 'root'
})
export class ThemeService implements OnDestroy {

    set mode(mode: UITheme) {
        if (mode) {
            this.localStorage.save(LS_KEY, mode);
            this.applySavedTheme();
        }
    }

    get mode(): UITheme {
        return this.readSavedTheme();
    }

    onThemeChange$ = new Subject();

    constructor(private readonly localStorage: LocalStorageService,
                @Inject(DARK_THEME_CLASS) @Optional() private readonly darkThemeClass: string,
                @Inject(LIGHT_THEME_CLASS) @Optional() private readonly lightThemeClass: string,
                @Inject(SYSTEM_THEME_CLASS) @Optional() private readonly systemThemeClass: string) {
        this.applySavedTheme();
    }

    ngOnDestroy() {
        this.onThemeChange$.complete();
    }

    private readSavedTheme(): UITheme {
        if (this.localStorage.has(LS_KEY)) {
            return this.localStorage.get(LS_KEY);
        }
        return UITheme.SYSTEM;
    }

    private applySavedTheme() {
        this.clearBodyClass();
        switch (this.readSavedTheme()) {
            case UITheme.DARK:
                this.addBodyClass(this.darkThemeClass);
                break;
            case UITheme.LIGHT:
                this.addBodyClass(this.lightThemeClass);
                break;
            case UITheme.SYSTEM:
                this.addBodyClass(this.systemThemeClass);
                break;
        }
        this.onThemeChange$.next(this.readSavedTheme());
    }

    private addBodyClass(classToAdd: string) {
        document.body.classList.add(classToAdd);
    }

    private clearBodyClass() {
        document.body.classList.remove(this.darkThemeClass, this.lightThemeClass, this.systemThemeClass);
    }


}
