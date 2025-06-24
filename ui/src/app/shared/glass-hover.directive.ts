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

import {Directive, ElementRef, HostListener} from '@angular/core';

/**
 * Visual directive to make target element to react on user hover over element
 */
@Directive({
    selector: '[glassHover]'
})
export class GlassHoverDirective {

    constructor(private elementRef: ElementRef) {
    }

    @HostListener("mousemove", ['$event'])
    onHover(event: MouseEvent) {
        const element = this.elementRef.nativeElement;
        if (!element.classList.contains('active')) {
            const rect = element.getBoundingClientRect();
            const x = event.clientX - rect.left; //x position within the element.
            const y = event.clientY - rect.top; //y position within the element.
            element.style.background = `radial-gradient(circle at ${x}px ${y}px , rgba(230,230,230,0.2),rgba(230,230,230,0) )`;
            element.style.borderImage = `radial-gradient(20% 75% at ${x}px ${y}px ,rgba(125,125,125,0.7),rgba(125,125,125,0.1) ) 1 / 1px / 0px stretch `;
        }
    }

    @HostListener("mouseleave", ['$event'])
    mouseLeave(_event: MouseEvent) {
        const element = this.elementRef.nativeElement;
        if (!element.classList.contains('active')) {
            element.style.background = null;
            element.style.borderImage = null;
        }
    }

}
