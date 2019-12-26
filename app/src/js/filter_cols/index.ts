function filterColsList(cols: Array<L.Polyline>, colsDOMList: HTMLCollectionOf<Element>): void {

    const filter_input = document.getElementById('filter_input');

    filter_input.addEventListener('keyup', function () {

        const filterInputElement: HTMLInputElement = this as HTMLInputElement
        const filterInputValue: string = filterInputElement.value

        let filterValue: string = filterInputValue.toLowerCase();
        let results: Array<any> = cols.filter((object: L.Polyline) => {
            return object.name.toLowerCase().indexOf(filterValue) !== -1;
        });

        Array.from(colsDOMList).forEach(function (colsDOMItem: Element) {

            let isColFound: Array<L.Polyline> = results.find((r: L.Polyline) => {
                return r.name === colsDOMItem.getAttribute("data-name");
            })

            if (isColFound) {
                colsDOMItem.parentElement.classList.remove('filtered_out');
            }

            if (!isColFound) {
                colsDOMItem.parentElement.classList.add('filtered_out');
            }
        });
    });
}

export {
    filterColsList
}