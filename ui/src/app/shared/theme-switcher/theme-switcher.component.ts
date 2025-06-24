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

import {Component, computed, input, OnInit, signal} from '@angular/core';
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {TitleCasePipe} from "@angular/common";
import {ThemeToggleComponent} from "./theme-toggle/theme-toggle.component";
import {ThemeService, UITheme} from "../../services/theme.service";

@Component({
    selector: 'app-theme-switcher',
    imports: [
        MatIcon,
        MatTooltip,
        TitleCasePipe,
        ThemeToggleComponent
    ],
    templateUrl: './theme-switcher.component.html',
    styleUrl: './theme-switcher.component.scss'
})
export class ThemeSwitcherComponent implements OnInit {

    themeIconMap: Record<UITheme, string> = {
        [UITheme.DARK]: 'dark_mode',
        [UITheme.LIGHT]: 'light_mode',
        [UITheme.SYSTEM]: 'contrast'
    };

    navbarOpened = input<boolean>();

    currentTheme = signal<UITheme>(UITheme.DARK);

    icon = computed(() => {
        const theme = this.currentTheme();
        return this.themeIconMap[theme] ?? '';
    });

    constructor(private themeService: ThemeService) {
    }

    ngOnInit() {
        this.currentTheme.set(this.themeService.mode);
        this.themeService.onThemeChange$.subscribe((theme: any) => {
            this.currentTheme.set(theme);
        });
    }

    switchTheme() {
        if (this.currentTheme() === UITheme.DARK) {
            this.themeService.mode = UITheme.LIGHT;
        } else {
            this.themeService.mode = UITheme.DARK;
        }
    }

    protected readonly UITheme = UITheme;
}
