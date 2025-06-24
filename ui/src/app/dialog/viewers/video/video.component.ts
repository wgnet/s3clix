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

import {Component, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';

@Component({
    selector: 'app-video',
    templateUrl: './video.component.html',
    styleUrls: ['./video.component.scss'],
    standalone: false
})
export class VideoComponent implements OnDestroy {

    @ViewChild('videoPlayer', {static: false}) videoPlayer: ElementRef | undefined;

    @Input('src')
    set srcSetter(src: string) {
        this.src = src;
        (this.videoPlayer?.nativeElement as HTMLVideoElement)?.load();
    }

    protected src = '';

    ngOnDestroy(): void {
        if (this.videoPlayer && this.videoPlayer.nativeElement) {
            const videoElement = this.videoPlayer.nativeElement as HTMLVideoElement;
            videoElement.pause();
            videoElement.src = '';
            videoElement.load();
        }
    }

}
