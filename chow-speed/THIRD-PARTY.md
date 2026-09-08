# Third party

## RocketSim

`assets/rlconst.js` is a transcription of physics constants, curves, boost-pad
locations and kickoff positions from **RocketSim** by ZealanL
(https://github.com/ZealanL/RocketSim), used under the MIT licence. Those values
are Rocket League's, documented and verified by that project; using them is why
this game plays at the right proportions instead of invented ones.

No RocketSim code is compiled or copied into this project — the simulation here is
written from scratch, in two dimensions, in JavaScript. Where a value could not be
translated flatly (the puck's contact friction, for one) the reading is noted in a
comment next to it rather than passed off as exact.

RocketSim's licence, reproduced:

```
MIT License

Copyright (c) 2022 ZealanL

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
