/**
 * A page is a component to switch between different views.
 */
export default interface Page {
    /**
     * Show the page.
     */
    show(): Promise<void>
}
